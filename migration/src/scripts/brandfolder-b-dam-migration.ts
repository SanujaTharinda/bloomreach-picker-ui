import { ParsedArgs, getArg } from '../utils/args.js';
import { Logger } from '../utils/logger.js';
import { requireEnv, getOptionalEnv } from '../utils/env.js';
import { BrandfolderService } from '../services/brandfolder.service.js';
import { ResourceSpaceService } from '../services/resourcespace.service.js';
import { BrandfolderReference } from '../types/index.js';
import { fetchWithRetry } from '../utils/fetch-with-retry.js';
import { categorizeTags, CategorizedTags, TAG_FIELD_MAPPINGS, buildResourceMetadata, RESOURCESPACE_FIELDS, STANDARD_FIELD_IDS } from '../config/tag-field-mappings.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import ExcelJS from 'exceljs';

/**
 * Brandfolder to B-DAM Migration Script
 * 
 * This script reads the inventory from phase-1, downloads attachments from Brandfolder,
 * uploads them to Resource Space (B-DAM), and updates the inventory with B-DAM values.
 */
export async function brandfolderBdamMigration(args: ParsedArgs): Promise<void> {
  await Logger.phase('Brandfolder to B-DAM Migration');

  // Get Bloomreach folder from command line arguments
  const bloomreachFolder = 
    getArg(args, 'folder') || 
    getArg(args, 'f') || 
    (Array.isArray(args._) && args._.length > 1 ? args._[1] : null);
  
  if (!bloomreachFolder) {
    await Logger.error('Bloomreach folder is required. Use --folder or -f to specify the folder, or pass it as a positional argument.');
    throw new Error('Missing required argument: folder');
  }

  await Logger.info(`Processing Bloomreach folder: ${bloomreachFolder}`);

  // Get configuration from environment variables
  const brandfolderApiKey = requireEnv('BRANDFOLDER_API_KEY');
  const brandfolderBaseUrl = getOptionalEnv('BRANDFOLDER_BASE_URL') || 'https://brandfolder.com/api/v4';
  const resourcespaceUrl = requireEnv('RESOURCESPACE_URL');
  const resourcespaceApiKey = requireEnv('RESOURCESPACE_API_KEY');
  const resourcespaceUser = getOptionalEnv('RESOURCESPACE_USER') || 'admin';

  // Get optional configuration
  const baseOutputDir = getOptionalEnv('MIGRATION_OUTPUT_DIR') || './migration-output';
  const phase1Dir = path.join(baseOutputDir, 'phase-1');
  const phase2Dir = path.join(baseOutputDir, 'phase-2');
  const inputFile = `${bloomreachFolder}-brandfolder-inventory.json`;
  const inputPath = path.join(phase1Dir, inputFile);
  const defaultOutputFile = `${bloomreachFolder}-b-dam-migration.json`;
  const outputFile = getOptionalEnv('MIGRATION_OUTPUT_FILE') || defaultOutputFile;

  // Initialize file logging if requested
  const enableFileLogging = getArg(args, 'log-file') || getArg(args, 'l') || getOptionalEnv('ENABLE_FILE_LOGGING') === 'true';
  if (enableFileLogging) {
    const logFileName = `${bloomreachFolder}-migration-${new Date().toISOString().split('T')[0]}.log`;
    const logFilePath = path.join(phase2Dir, logFileName);
    await Logger.initializeFileLogging(logFilePath);
    await Logger.info(`File logging enabled: ${logFilePath}`);
  }

  // Initialize services
  const brandfolderService = new BrandfolderService(brandfolderApiKey, brandfolderBaseUrl);
  const resourcespaceService = new ResourceSpaceService(resourcespaceUrl, resourcespaceApiKey, resourcespaceUser);

  // Ensure collections exist: root collection (configurable) and sub-collection with folder name
  await Logger.info('Ensuring collections exist...');
  const rootCollectionName = getOptionalEnv('RESOURCESPACE_ROOT_COLLECTION_NAME') || 'Website Archive';
  const rootCollectionId = await resourcespaceService.findCollectionByName(rootCollectionName, 0) 
    ?? await resourcespaceService.createCollection(rootCollectionName, 0);
  await Logger.info(`Root collection "${rootCollectionName}" has ID: ${rootCollectionId}`);

  const subCollectionId = await resourcespaceService.findCollectionByName(bloomreachFolder, rootCollectionId)
    ?? await resourcespaceService.createCollection(bloomreachFolder, rootCollectionId);
  await Logger.info(`Sub-collection "${bloomreachFolder}" has ID: ${subCollectionId}`);

  await Logger.info(`Input file: ${inputPath}`);
  await Logger.info(`Output directory: ${phase2Dir}`);
  await Logger.info(`Output file: ${outputFile}`);

  // Step 0: Load global lookup file for existing Resource Space resources
  const lookupFilePath = path.join(baseOutputDir, 'resourcespace-lookup.json');
  const resourceLookup = await loadResourceLookup(lookupFilePath);
  await Logger.info(`Loaded resource lookup: ${resourceLookup.size} existing mappings`);

  // Step 1: Check if phase-2 file exists (for retry scenario)
  const outputPath = path.join(phase2Dir, outputFile);
  let existingPhase2Result: Phase2MigrationResult | null = null;
  let referencesToProcess: BrandfolderReference[] = [];
  let isRetryMode = false;

  try {
    const phase2Content = await fs.readFile(outputPath, 'utf-8');
    existingPhase2Result = JSON.parse(phase2Content) as Phase2MigrationResult;
    isRetryMode = true;
    await Logger.info(`Found existing phase-2 file. Running in retry mode - processing only failed items (bdamValue === null)...`);
    
    // Filter to only process items with bdamValue === null
    referencesToProcess = existingPhase2Result.references
      .filter(ref => ref.bdamValue === null)
      .map(({ bdamValue, ...ref }) => ref); // Remove bdamValue to get BrandfolderReference
    
    await Logger.info(`Found ${referencesToProcess.length} failed items out of ${existingPhase2Result.references.length} total references`);
    
    if (referencesToProcess.length === 0) {
      await Logger.info('No failed items to retry. All items have been successfully migrated.');
      return;
    }
  } catch {
    // Phase-2 file doesn't exist, read from phase-1
    await Logger.info('Reading phase-1 inventory file...');
    const inventory = await readInventoryFile(inputPath);
    await Logger.info(`Loaded inventory with ${inventory.summary.totalReferences} references`);
    referencesToProcess = inventory.references;
  }

  // On initial run (not retry mode), skip videos - they will be processed on subsequent runs
  // This is because video uploads may have file size limitations
  let skippedVideos: BrandfolderReference[] = [];
  if (!isRetryMode) {
    const originalCount = referencesToProcess.length;
    const { videos, nonVideos } = separateVideoReferences(referencesToProcess);
    skippedVideos = videos;
    referencesToProcess = nonVideos;
    
    if (skippedVideos.length > 0) {
      await Logger.info(`Initial run: Skipping ${skippedVideos.length} video references (will be processed on subsequent runs)`);
      await Logger.info(`Processing ${referencesToProcess.length} non-video references out of ${originalCount} total`);
    }
  }

  // Step 2: Process each reference
  await Logger.info(`Processing ${referencesToProcess.length} references...`);
  
  const processedReferences: BrandfolderReferenceWithBdam[] = [];
  let processedCount = 0;
  let successfulCount = 0;
  let failedCount = 0;
  
  for (const reference of referencesToProcess) {
    try {
      const updatedRef = await processReference(
        reference, 
        brandfolderService, 
        resourcespaceService, 
        subCollectionId,
        resourceLookup,
        brandfolderApiKey,
        brandfolderBaseUrl
      );
      // Add success message
      processedReferences.push({
        ...updatedRef,
        message: 'Success',
      });
      successfulCount++;
      processedCount++;
      
      if (processedCount % 10 === 0) {
        await Logger.info(`Processed ${processedCount}/${referencesToProcess.length} references (${successfulCount} successful, ${failedCount} failed)...`);
      }
    } catch (error) {
      await Logger.error(`Failed to process reference ${reference.attachmentId}:`, error);
      // Extract error message
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Add reference with error state (null) and error message
      processedReferences.push({
        ...reference,
        bdamValue: null,
        message: errorMessage,
      });
      failedCount++;
      processedCount++;
    }
  }
  
  await Logger.info(`Completed processing ${processedCount} references`);

  // Step 3: Merge results if in retry mode, otherwise create new result
  await Logger.info('Preparing migration results...');
  await fs.mkdir(phase2Dir, { recursive: true });

  let phase2Result: Phase2MigrationResult;
  
  if (isRetryMode && existingPhase2Result) {
    // Merge results: update existing entries with new results, keep successful ones
    const referenceMap = new Map<string, BrandfolderReferenceWithBdam>();
    
    // First, add all existing references to the map
    for (const ref of existingPhase2Result.references) {
      referenceMap.set(`${ref.documentId}:${ref.fieldPath}:${ref.attachmentId}`, ref);
    }
    
    // Then, update with newly processed references
    for (const ref of processedReferences) {
      const key = `${ref.documentId}:${ref.fieldPath}:${ref.attachmentId}`;
      referenceMap.set(key, ref);
    }
    
    const mergedReferences = Array.from(referenceMap.values());
    const totalSuccessful = mergedReferences.filter(ref => ref.bdamValue !== null).length;
    const totalFailed = mergedReferences.filter(ref => ref.bdamValue === null).length;
    
    phase2Result = {
      generatedAt: existingPhase2Result.generatedAt,
      lastUpdated: new Date().toISOString(),
      bloomreachFolder: bloomreachFolder,
      phase1InventoryFile: existingPhase2Result.phase1InventoryFile,
      summary: {
        totalReferences: mergedReferences.length,
        processed: mergedReferences.length,
        successful: totalSuccessful,
        failed: totalFailed,
      },
      references: mergedReferences,
    };
    
    await Logger.info(`Merged results: ${totalSuccessful} successful, ${totalFailed} failed (out of ${mergedReferences.length} total)`);
  } else {
    // Create new result from phase-1
    // Include skipped videos as pending (bdamValue: null) so they will be processed on retry
    const skippedVideoReferences: BrandfolderReferenceWithBdam[] = skippedVideos.map(ref => ({
      ...ref,
      bdamValue: null,
      message: 'Skipped: Video files are processed on subsequent runs',
    }));
    
    const allReferences = [...processedReferences, ...skippedVideoReferences];
    const totalReferences = referencesToProcess.length + skippedVideos.length;
    
    phase2Result = {
      generatedAt: new Date().toISOString(),
      bloomreachFolder: bloomreachFolder,
      phase1InventoryFile: inputFile,
      summary: {
        totalReferences: totalReferences,
        processed: processedCount,
        successful: successfulCount,
        failed: failedCount,
        skippedVideos: skippedVideos.length,
      },
      references: allReferences,
    };
  }

  // Step 4: Write updated inventory to phase-2
  await Logger.info('Writing migration results...');

  await fs.writeFile(outputPath, JSON.stringify(phase2Result, null, 2), 'utf-8');
  await Logger.success(`Migration results saved to: ${outputPath}`);

  // Step 5: Save updated resource lookup
  await saveResourceLookup(lookupFilePath, resourceLookup);
  await Logger.info(`Saved resource lookup: ${resourceLookup.size} total mappings`);

  // Step 5.5: Generate Excel report
  await Logger.info('Generating Excel report...');
  const excelFileName = `${bloomreachFolder}-b-dam-migration.xlsx`;
  const excelFilePath = path.join(phase2Dir, excelFileName);
  await generateMigrationExcelReport(excelFilePath, phase2Result);
  await Logger.success(`Excel report saved to: ${excelFilePath}`);

  // Step 6: Display summary
  await Logger.info('\n=== Migration Summary ===');
  await Logger.info(`Bloomreach folder: ${bloomreachFolder}`);
  await Logger.info(`Mode: ${isRetryMode ? 'Retry (processing failed items only)' : 'Initial migration'}`);
  await Logger.info(`Total references: ${phase2Result.summary.totalReferences}`);
  await Logger.info(`Processed in this run: ${processedCount}`);
  await Logger.info(`Successful in this run: ${successfulCount}`);
  await Logger.info(`Failed in this run: ${failedCount}`);
  await Logger.info(`Overall successful: ${phase2Result.summary.successful}`);
  await Logger.info(`Overall failed: ${phase2Result.summary.failed}`);
  await Logger.info(`Overall success rate: ${phase2Result.summary.totalReferences > 0 ? ((phase2Result.summary.successful / phase2Result.summary.totalReferences) * 100).toFixed(2) : 0}%`);

  await Logger.success('Migration completed successfully');

  // Close file logging if enabled
  if (enableFileLogging) {
    await Logger.closeFileLogging();
  }
}

/**
 * Process a single Brandfolder reference:
 * 1. Extract cdn_url from rawValue JSON
 * 2. Fetch asset metadata from Brandfolder (name, description, tags)
 * 3. Download the file from cdn_url
 * 4. Create resource in Resource Space WITH metadata (single API call)
 * 5. Upload file to the resource
 * 6. Add to collection
 * 7. Update reference with B-DAM response
 */
async function processReference(
  reference: BrandfolderReference,
  _brandfolderService: BrandfolderService,
  resourcespaceService: ResourceSpaceService,
  collectionId: number,
  resourceLookup: Map<string, number>,
  brandfolderApiKey: string,
  brandfolderBaseUrl: string
): Promise<BrandfolderReferenceWithBdam> {
  await Logger.info(`Processing reference: attachmentId=${reference.attachmentId}, assetId=${reference.assetId}`);

  // Step 0: Check if resource already exists in lookup
  const lookupKey = `${reference.attachmentId}:${reference.assetId}`;
  let resourcespaceRef: number;
  let knownMetadata: { title: string; description: string } | undefined;
  // Track metadata for auditing
  let brandfolderMetadata: { title: string; description: string; tags: string[] } | undefined;
  let bdamMetadata: { title: string; description: string; customFields: Record<number, string> } | undefined;
  
  if (resourceLookup.has(lookupKey)) {
    resourcespaceRef = resourceLookup.get(lookupKey)!;
    await Logger.info(`Found existing Resource Space resource in lookup: ${resourcespaceRef} - skipping upload and metadata update`);
    
    // Still need to add it to the collection if not already there
    try {
      await resourcespaceService.addResourceToCollection(collectionId, resourcespaceRef);
      await Logger.info(`Added existing resource ${resourcespaceRef} to collection ${collectionId}`);
    } catch (error) {
      // Resource might already be in collection, that's okay
      await Logger.info(`Resource ${resourcespaceRef} may already be in collection ${collectionId}`);
    }
    // Note: knownMetadata remains undefined for existing resources
    // Title/description were already set in a previous run
  } else {
    // Step 1: Extract cdn_url and mimetype from rawValue JSON
    const rawValueParsed = JSON.parse(reference.rawValue) as Array<{ 
      cdn_url?: string; 
      filename?: string; 
      mimetype?: string;
      attributes?: {
        mimetype?: string;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    }>;
    
    if (!Array.isArray(rawValueParsed) || rawValueParsed.length === 0) {
      throw new Error('Invalid rawValue format: expected array with at least one item');
    }

    const attachmentData = rawValueParsed[0];
    const cdnUrl = attachmentData.cdn_url;
    const filename = attachmentData.filename;
    // Try to get mimetype from attributes first, then from root level
    const mimetype = attachmentData.attributes?.mimetype || attachmentData.mimetype;

    if (!cdnUrl || typeof cdnUrl !== 'string') {
      throw new Error('cdn_url not found in rawValue');
    }

    if (!filename || typeof filename !== 'string') {
      throw new Error('filename not found in rawValue');
    }

    // Step 2: Fetch asset metadata from Brandfolder FIRST (needed for create_resource)
    let assetData: BrandfolderAssetData | null = null;
    try {
      assetData = await fetchAssetDataFromBrandfolder(
        reference.assetId,
        brandfolderApiKey,
        brandfolderBaseUrl
      );
      knownMetadata = {
        title: assetData.name,
        description: assetData.description,
      };
      // Store Brandfolder metadata for auditing
      brandfolderMetadata = {
        title: assetData.name,
        description: assetData.description,
        tags: assetData.tags,
      };
      // Store B-DAM metadata for auditing (what will be written to ResourceSpace)
      bdamMetadata = {
        title: assetData.name,
        description: assetData.description,
        customFields: assetData.categorizedTags.fieldValues,
      };
    } catch (metadataError) {
      await Logger.warn(`Failed to fetch Brandfolder metadata: ${metadataError}`);
    }

    // Step 3: Download the file from cdn_url
    await Logger.info(`Downloading from cdn_url: ${cdnUrl}`);
    const { buffer: fileBuffer, contentType: downloadedContentType } = await downloadFromCdnUrl(cdnUrl);
    await Logger.info(`Downloaded file: ${filename} (${fileBuffer.length} bytes)`);

    // Step 3.5: Update filename with correct extension from Content-Type to avoid Resource Space validation errors
    const updatedFilename = updateFilenameWithExtension(filename, downloadedContentType);
    if (updatedFilename !== filename) {
      await Logger.info(`Updated filename from "${filename}" to "${updatedFilename}" based on Content-Type: ${downloadedContentType}`);
    }

    // Step 4: Create resource in Resource Space WITH metadata
    await Logger.info(`Creating resource in Resource Space with metadata...`);
    const resourceType = getResourceTypeFromMimeType(downloadedContentType || mimetype);
    const contentTypeForUpload = downloadedContentType || mimetype;
    await Logger.info(`Determined resource type: ${resourceType} (from Content-Type: ${downloadedContentType || mimetype || 'unknown'})`);

    // Build metadata JSON for create_resource API (field ID -> value pairs)
    let metadataJson: string | undefined;
    if (assetData) {
      metadataJson = buildResourceMetadata(
        assetData.name,
        assetData.description,
        assetData.categorizedTags.fieldValues
      );
      await Logger.info(`Metadata JSON: ${metadataJson}`);
    }

    resourcespaceRef = await resourcespaceService.createResource(resourceType, metadataJson);
    await Logger.info(`Created Resource Space resource with ID: ${resourcespaceRef}`);

    // Step 5: Upload the file to the resource
    await Logger.info(`Uploading file to Resource Space resource ${resourcespaceRef}...`);
    await resourcespaceService.uploadFileToResource(resourcespaceRef, fileBuffer, updatedFilename, contentTypeForUpload, resourceType);

    // Step 6: Add resource to collection
    await Logger.info(`Adding resource ${resourcespaceRef} to collection ${collectionId}...`);
    await resourcespaceService.addResourceToCollection(collectionId, resourcespaceRef);

    // Step 7: Add to lookup
    resourceLookup.set(lookupKey, resourcespaceRef);
    await Logger.info(`Added to resource lookup: ${lookupKey} -> ${resourcespaceRef}`);
  }

  // Step 7: Get Resource Space object with all required properties
  // Pass known metadata to avoid fetching field data from ResourceSpace
  await Logger.info(`Retrieving Resource Space resource data...`);
  const bdamResponse = await resourcespaceService.getResourceForBdam(resourcespaceRef, knownMetadata);

  await Logger.info(`Retrieved Resource Space resource: ${bdamResponse.title} (ID: ${bdamResponse.id})`);

  // Step 8: Return updated reference with B-DAM value (as array with single item, stringified)
  return {
    ...reference,
    bdamValue: JSON.stringify([bdamResponse]),
    brandfolderMetadata,
    bdamMetadata,
  };
}

/**
 * Get file extension from Content-Type/MIME type
 */
function getExtensionFromContentType(contentType: string | null): string {
  if (!contentType) {
    return '';
  }

  // Remove any parameters (e.g., "image/jpeg; charset=utf-8" -> "image/jpeg")
  const mimeType = contentType.split(';')[0].trim().toLowerCase();

  const mimeToExtension: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    'image/svg': '.svg',
    'image/bmp': '.bmp',
    'image/tiff': '.tiff',
    'image/tif': '.tif',
    'video/mp4': '.mp4',
    'video/quicktime': '.mov',
    'video/x-msvideo': '.avi',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'text/plain': '.txt',
    'text/html': '.html',
    'text/css': '.css',
    'text/javascript': '.js',
    'application/json': '.json',
    'application/xml': '.xml',
    'application/zip': '.zip',
  };

  return mimeToExtension[mimeType] || '';
}

/**
 * Update filename to ensure it has the correct extension based on Content-Type
 */
function updateFilenameWithExtension(filename: string, contentType: string | null): string {
  if (!contentType) {
    return filename;
  }

  const extension = getExtensionFromContentType(contentType);
  if (!extension) {
    return filename; // No extension mapping found, keep original filename
  }

  // Remove existing extension if present
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  
  // Add the correct extension
  return `${nameWithoutExt}${extension}`;
}

/**
 * Get ResourceSpace resource type ID from MIME type
 * Common ResourceSpace resource types:
 * - 1 = Photo/Image
 * - 2 = Document
 * - 3 = Video
 * - 4 = Audio
 * Defaults to 1 (Photo) if MIME type cannot be determined
 */
function getResourceTypeFromMimeType(mimetype?: string): number {
  if (!mimetype || typeof mimetype !== 'string') {
    return 1; // Default to Photo
  }

  const mimeLower = mimetype.toLowerCase();

  // SVG files should be uploaded as Document (2), not Photo (1)
  // SVG files are XML-based and don't have EXIF data like raster images
  if (mimeLower === 'image/svg+xml' || mimeLower === 'image/svg') {
    return 2; // Document
  }

  // Image types -> Photo (1)
  if (mimeLower.startsWith('image/')) {
    return 1;
  }

  // Video types -> Video (3)
  if (mimeLower.startsWith('video/')) {
    return 3;
  }

  // Audio types -> Audio (4)
  if (mimeLower.startsWith('audio/')) {
    return 4;
  }

  // Document types -> Document (2)
  if (
    mimeLower === 'application/pdf' ||
    mimeLower.startsWith('application/msword') ||
    mimeLower.startsWith('application/vnd.openxmlformats-officedocument') ||
    mimeLower.startsWith('application/vnd.ms-') ||
    mimeLower.startsWith('text/')
  ) {
    return 2;
  }

  // Default to Photo for unknown types
  return 1;
}

/**
 * Check if a MIME type is a video type
 */
function isVideoMimeType(mimetype?: string): boolean {
  if (!mimetype) return false;
  return mimetype.toLowerCase().startsWith('video/');
}

/**
 * Separate video references from non-video references
 * Used to skip videos on initial run and process them on subsequent runs
 */
function separateVideoReferences(references: BrandfolderReference[]): { 
  videos: BrandfolderReference[]; 
  nonVideos: BrandfolderReference[]; 
} {
  const videos: BrandfolderReference[] = [];
  const nonVideos: BrandfolderReference[] = [];

  for (const ref of references) {
    try {
      const rawValueParsed = JSON.parse(ref.rawValue) as Array<{ 
        mimetype?: string; 
        attributes?: { mimetype?: string } 
      }>;
      const mimetype = rawValueParsed[0]?.attributes?.mimetype || rawValueParsed[0]?.mimetype;
      
      if (isVideoMimeType(mimetype)) {
        videos.push(ref);
      } else {
        nonVideos.push(ref);
      }
    } catch {
      // If parsing fails, treat as non-video
      nonVideos.push(ref);
    }
  }

  return { videos, nonVideos };
}

/**
 * Brandfolder asset data response structure
 */
interface BrandfolderAssetData {
  id: string;
  name: string;
  description: string;
  tags: string[]; // Only non-auto-generated tags (all of them)
  categorizedTags: CategorizedTags; // Tags categorized into fields and keywords
}

/**
 * Fetch asset data from Brandfolder including tags
 * Only returns tags where auto_generated=false
 */
async function fetchAssetDataFromBrandfolder(
  assetId: string,
  apiKey: string,
  baseUrl: string
): Promise<BrandfolderAssetData> {
  const url = `${baseUrl}/assets/${assetId}?include=tags`;
  
  await Logger.info(`Fetching asset data from Brandfolder: ${assetId}`);

  const response = await fetchWithRetry(url, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch asset data from Brandfolder: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json() as {
    data: {
      id: string;
      type: string;
      attributes: {
        name: string;
        description: string;
        [key: string]: unknown;
      };
      relationships?: {
        tags?: {
          data: Array<{ id: string; type: string }>;
        };
      };
    };
    included?: Array<{
      id: string;
      type: string;
      attributes: {
        name: string;
        auto_generated: boolean;
        source: string;
      };
    }>;
  };

  // Extract non-auto-generated tags
  const tags: string[] = [];
  if (data.included) {
    for (const item of data.included) {
      if (item.type === 'tags' && item.attributes.auto_generated === false) {
        tags.push(item.attributes.name);
      }
    }
  }

  // Categorize tags into predefined fields and keywords
  const categorizedTags = categorizeTags(tags);

  const name = data.data.attributes.name || '';
  const description = data.data.attributes.description || '';

  await Logger.info(`Asset data from Brandfolder:`);
  await Logger.info(`  - Title: ${name}`);
  await Logger.info(`  - Description: ${description || '(empty)'}`);
  await Logger.info(`  - User tags (${tags.length}): ${tags.length > 0 ? tags.join(', ') : '(none)'}`);
  
  // Log categorization results if there are any configured mappings
  if (TAG_FIELD_MAPPINGS.length > 0) {
    const fieldCount = Object.keys(categorizedTags.fieldValues).length;
    await Logger.info(`  - Tags mapped to ${fieldCount} field(s)`);
    
    if (fieldCount > 0) {
      for (const [field, value] of Object.entries(categorizedTags.fieldValues)) {
        await Logger.info(`    - ${field}: ${value}`);
      }
    }
  }

  return {
    id: data.data.id,
    name,
    description,
    tags,
    categorizedTags,
  };
}

/**
 * Download a file from a CDN URL
 * Returns both the file buffer and the Content-Type header
 */
async function downloadFromCdnUrl(url: string): Promise<{ buffer: Buffer; contentType: string | null }> {
  const response = await fetchWithRetry(url);

  const contentType = response.headers.get('content-type');
  const length = response.headers.get('content-length');
  await Logger.info(`Content type: ${contentType}`);
  await Logger.info(`Content length: ${length}`);

  if (!response.ok) {
    throw new Error(`Failed to download from ${url}: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType,
  };
}

/**
 * Load the global Resource Space lookup file
 * Maps (attachmentId:assetId) -> resourceSpaceRef
 */
async function loadResourceLookup(filePath: string): Promise<Map<string, number>> {
  const lookup = new Map<string, number>();
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content) as { mappings: Record<string, number> };
    
    if (data.mappings) {
      for (const [key, value] of Object.entries(data.mappings)) {
        lookup.set(key, value);
      }
    }
    
    await Logger.info(`Loaded ${lookup.size} mappings from lookup file`);
  } catch (error) {
    // File doesn't exist or is invalid, start with empty lookup
    await Logger.info('Lookup file not found or invalid, starting with empty lookup');
  }
  
  return lookup;
}

/**
 * Save the global Resource Space lookup file
 */
async function saveResourceLookup(filePath: string, lookup: Map<string, number>): Promise<void> {
  const mappings: Record<string, number> = {};
  
  for (const [key, value] of lookup.entries()) {
    mappings[key] = value;
  }
  
  const data = {
    generatedAt: new Date().toISOString(),
    mappings,
  };
  
  // Ensure directory exists
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  await Logger.info(`Saved ${lookup.size} mappings to lookup file`);
}

/**
 * Read and parse the phase-1 inventory file
 */
async function readInventoryFile(filePath: string): Promise<Phase1Inventory> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const inventory = JSON.parse(content) as Phase1Inventory;
    return inventory;
  } catch (error) {
    throw new Error(`Failed to read inventory file ${filePath}: ${error}`);
  }
}

/**
 * Extract CDN URL from rawValue JSON string (Brandfolder format)
 */
function extractBrandfolderCdnUrl(rawValue: string): string {
  try {
    const parsed = JSON.parse(rawValue) as Array<{ cdn_url?: string }>;
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].cdn_url) {
      return parsed[0].cdn_url;
    }
  } catch {
    // Parsing failed, return empty
  }
  return '';
}

/**
 * Extract CDN URL from bdamValue JSON string (B-DAM format)
 */
function extractBdamCdnUrl(bdamValue: string | null): string {
  if (!bdamValue) return '';
  try {
    const parsed = JSON.parse(bdamValue) as Array<{ cdn_url?: string }>;
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].cdn_url) {
      return parsed[0].cdn_url;
    }
  } catch {
    // Parsing failed, return empty
  }
  return '';
}

/**
 * Format Brandfolder metadata for Excel display
 */
function formatBrandfolderMetadata(metadata?: { title: string; description: string; tags: string[] }): string {
  if (!metadata) return '';
  
  const parts: string[] = [];
  if (metadata.title) {
    parts.push(`Title: ${metadata.title}`);
  }
  if (metadata.description) {
    parts.push(`Description: ${metadata.description}`);
  }
  if (metadata.tags && metadata.tags.length > 0) {
    parts.push(`Tags: ${metadata.tags.join(', ')}`);
  }
  return parts.join('\n');
}

/**
 * Format B-DAM metadata for Excel display
 * Shows what was written to ResourceSpace with field names
 */
function formatBdamMetadata(metadata?: { title: string; description: string; customFields: Record<number, string> }): string {
  if (!metadata) return '';
  
  const parts: string[] = [];
  
  // Standard fields
  if (metadata.title) {
    parts.push(`Title (field ${STANDARD_FIELD_IDS.title}): ${metadata.title}`);
  }
  if (metadata.description) {
    parts.push(`Caption (field ${STANDARD_FIELD_IDS.description}): ${metadata.description}`);
  }
  
  // Custom fields - get display names from RESOURCESPACE_FIELDS
  if (metadata.customFields) {
    for (const [fieldIdStr, value] of Object.entries(metadata.customFields)) {
      if (value) {
        const fieldId = parseInt(fieldIdStr, 10);
        // Find the field definition to get the display name
        const fieldDef = Object.values(RESOURCESPACE_FIELDS).find(f => f.fieldId === fieldId);
        const fieldName = fieldDef?.displayName || `Field ${fieldId}`;
        parts.push(`${fieldName} (field ${fieldId}): ${value}`);
      }
    }
  }
  
  return parts.join('\n');
}

/**
 * Generate Excel report for migration results
 */
async function generateMigrationExcelReport(
  filePath: string,
  migrationResult: Phase2MigrationResult
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'B-DAM Migration Tool';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Migration Report');

  // Add title
  worksheet.addRow(['Phase 2: Brandfolder to B-DAM Migration Report']);
  worksheet.addRow([]);

  // Add summary section
  worksheet.addRow(['Summary']);
  worksheet.addRow(['Generated At', migrationResult.generatedAt]);
  if (migrationResult.lastUpdated) {
    worksheet.addRow(['Last Updated', migrationResult.lastUpdated]);
  }
  worksheet.addRow(['Bloomreach Folder', migrationResult.bloomreachFolder]);
  worksheet.addRow(['Phase 1 Input File', migrationResult.phase1InventoryFile]);
  worksheet.addRow(['Total References', migrationResult.summary.totalReferences]);
  worksheet.addRow(['Processed', migrationResult.summary.processed]);
  worksheet.addRow(['Successful', migrationResult.summary.successful]);
  worksheet.addRow(['Failed', migrationResult.summary.failed]);
  if (migrationResult.summary.skippedVideos !== undefined) {
    worksheet.addRow(['Skipped Videos', migrationResult.summary.skippedVideos]);
  }
  worksheet.addRow([]);
  worksheet.addRow([]);

  // Style the title
  const titleRow = worksheet.getRow(1);
  titleRow.font = { bold: true, size: 14 };

  // Style the summary header
  const summaryHeaderRow = worksheet.getRow(3);
  summaryHeaderRow.font = { bold: true };

  // Separate successful and failed references
  const successfulRefs = migrationResult.references.filter(ref => ref.bdamValue !== null);
  const failedRefs = migrationResult.references.filter(ref => ref.bdamValue === null);

  // Add successful references table
  const successStartRow = worksheet.rowCount + 1;
  worksheet.addRow(['Successfully Migrated References']);
  const successTitleRow = worksheet.getRow(successStartRow);
  successTitleRow.font = { bold: true, size: 12 };
  worksheet.addRow([]);

  // Successful references header
  const successHeaders = [
    'Brandfolder Attachment ID',
    'Brandfolder Asset ID',
    'Bloomreach Document ID',
    'Bloomreach Document Path',
    'Brandfolder CDN URL',
    'B-DAM CDN URL',
    'Brandfolder Metadata',
    'B-DAM Metadata',
    'Brandfolder Raw Value',
    'B-DAM Raw Value',
  ];
  const successHeaderRow = worksheet.addRow(successHeaders);
  successHeaderRow.font = { bold: true };
  successHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF90EE90' }, // Light green
  };

  // Add successful reference rows
  for (const ref of successfulRefs) {
    worksheet.addRow([
      ref.attachmentId,
      ref.assetId,
      ref.documentId,
      ref.documentPath,
      extractBrandfolderCdnUrl(ref.rawValue),
      extractBdamCdnUrl(ref.bdamValue),
      formatBrandfolderMetadata(ref.brandfolderMetadata),
      formatBdamMetadata(ref.bdamMetadata),
      ref.rawValue,
      ref.bdamValue || '',
    ]);
  }

  worksheet.addRow([]);
  worksheet.addRow([]);

  // Add failed references table
  const failedStartRow = worksheet.rowCount + 1;
  worksheet.addRow(['Migration Failed References']);
  const failedTitleRow = worksheet.getRow(failedStartRow);
  failedTitleRow.font = { bold: true, size: 12 };
  worksheet.addRow([]);

  // Failed references header
  const failedHeaders = [
    'Brandfolder Attachment ID',
    'Brandfolder Asset ID',
    'Bloomreach Document ID',
    'Bloomreach Document Path',
    'Brandfolder CDN URL',
    'Migration Error',
    'Brandfolder Metadata',
    'Brandfolder Raw Value',
  ];
  const failedHeaderRow = worksheet.addRow(failedHeaders);
  failedHeaderRow.font = { bold: true };
  failedHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFCCCB' }, // Light red
  };

  // Add failed reference rows
  for (const ref of failedRefs) {
    worksheet.addRow([
      ref.attachmentId,
      ref.assetId,
      ref.documentId,
      ref.documentPath,
      extractBrandfolderCdnUrl(ref.rawValue),
      ref.message || 'Unknown error',
      formatBrandfolderMetadata(ref.brandfolderMetadata),
      ref.rawValue,
    ]);
  }

  // Set column widths
  worksheet.columns = [
    { width: 30 },  // Attachment ID
    { width: 30 },  // Asset ID
    { width: 40 },  // Document ID
    { width: 50 },  // Document Path
    { width: 60 },  // Brandfolder CDN URL
    { width: 60 },  // B-DAM CDN URL / Migration Error
    { width: 60 },  // Brandfolder Metadata
    { width: 60 },  // B-DAM Metadata
    { width: 80 },  // Brandfolder Raw Value
    { width: 80 },  // B-DAM Raw Value
  ];

  // Save the workbook
  await workbook.xlsx.writeFile(filePath);
}

// Type definitions for phase-1 inventory and phase-2 output
interface Phase1Inventory {
  generatedAt: string;
  bloomreachFolder: string;
  summary: {
    totalDocuments: number;
    totalReferences: number;
    uniqueAssetIds: number;
    uniqueAttachmentIds: number;
  };
  references: BrandfolderReference[];
}

export interface BrandfolderReferenceWithBdam extends BrandfolderReference {
  bdamValue: string | null; // Stringified BdamResponse object
  message?: string; // Success message or error message
  /** Brandfolder metadata for auditing: title, description, tags */
  brandfolderMetadata?: {
    title: string;
    description: string;
    tags: string[];
  };
  /** B-DAM metadata for auditing: what was written to ResourceSpace */
  bdamMetadata?: {
    title: string;
    description: string;
    customFields: Record<number, string>; // fieldId -> value
  };
}

interface Phase2MigrationResult {
  generatedAt: string;
  lastUpdated?: string; // Added when merging results in retry mode
  bloomreachFolder: string;
  phase1InventoryFile: string;
  summary: {
    totalReferences: number;
    processed: number;
    successful: number;
    failed: number;
    skippedVideos?: number; // Videos skipped on initial run (processed on subsequent runs)
  };
  references: BrandfolderReferenceWithBdam[];
}

