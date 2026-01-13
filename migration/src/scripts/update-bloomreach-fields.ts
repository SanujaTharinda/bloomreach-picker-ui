import { ParsedArgs, getArg } from '../utils/args.js';
import { Logger } from '../utils/logger.js';
import { requireEnv, getOptionalEnv } from '../utils/env.js';
import { BloomreachService, BloomreachDocument } from '../services/bloomreach.service.js';
import { BrandfolderReferenceWithBdam } from './brandfolder-b-dam-migration.js';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Phase 3: Update Bloomreach Fields Script (Content Import Approach)
 * 
 * This script reads the phase-2 migration results and creates an NDJSON file
 * with updated Bloomreach documents, then imports them via the content import endpoint.
 */
export async function updateBloomreachFields(args: ParsedArgs): Promise<void> {
  await Logger.phase('Update Bloomreach Fields with B-DAM Values (Content Import)');

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
  const bloomreachApiUrl = requireEnv('BLOOMREACH_API_URL');
  const bloomreachApiKey = requireEnv('BLOOMREACH_MANAGEMENT_API_KEY');
  const bloomreachProjectId = requireEnv('BLOOMREACH_PROJECT_ID');

  // Get optional configuration
  const baseOutputDir = getOptionalEnv('MIGRATION_OUTPUT_DIR') || './migration-output';
  const phase2Dir = path.join(baseOutputDir, 'phase-2');
  const phase3Dir = path.join(baseOutputDir, 'phase-3');
  const inputFile = `${bloomreachFolder}-b-dam-migration.json`;
  const inputPath = path.join(phase2Dir, inputFile);
  const ndjsonFileName = `${bloomreachFolder}-content-import.ndjson`;
  const ndjsonFilePath = path.join(phase3Dir, ndjsonFileName);

  // Initialize file logging if requested
  const enableFileLogging = getArg(args, 'log-file') || getArg(args, 'l') || getOptionalEnv('ENABLE_FILE_LOGGING') === 'true';
  if (enableFileLogging) {
    const logFileName = `${bloomreachFolder}-phase3-${new Date().toISOString().split('T')[0]}.log`;
    const logFilePath = path.join(phase3Dir, logFileName);
    await Logger.initializeFileLogging(logFilePath);
    await Logger.info(`File logging enabled: ${logFilePath}`);
  }

  // Initialize services
  const bloomreachService = new BloomreachService(bloomreachApiUrl, bloomreachApiKey);
  await Logger.info(`Using Bloomreach project for import: ${bloomreachProjectId}`);

  await Logger.info(`Input file: ${inputPath}`);
  await Logger.info(`Output directory: ${phase3Dir}`);
  await Logger.info(`NDJSON file: ${ndjsonFileName}`);

  // Step 1: Read phase-2 migration results
  await Logger.info('Reading phase-2 migration results...');
  const phase2Result = await readPhase2File(inputPath);
  await Logger.info(`Loaded ${phase2Result.references.length} references from phase-2`);

  // Step 2: Filter references that have bdamValue (successfully migrated)
  const referencesToUpdate = phase2Result.references.filter(ref => ref.bdamValue !== null);
  await Logger.info(`Found ${referencesToUpdate.length} references with B-DAM values to update`);

  if (referencesToUpdate.length === 0) {
    await Logger.info('No references to update. All references either failed migration or have no B-DAM value.');
    return;
  }

  // Step 3: Group references by document path to avoid fetching the same document multiple times
  const documentMap = new Map<string, BrandfolderReferenceWithBdam[]>();
  for (const reference of referencesToUpdate) {
    const docPath = reference.documentPath;
    if (!documentMap.has(docPath)) {
      documentMap.set(docPath, []);
    }
    documentMap.get(docPath)!.push(reference);
  }

  await Logger.info(`Processing ${documentMap.size} unique documents with ${referencesToUpdate.length} field updates...`);

  // Step 4: Process each document and create NDJSON entries
  await Logger.info('Creating NDJSON entries...');
  await fs.mkdir(phase3Dir, { recursive: true });

  const ndjsonLines: string[] = [];
  let processedDocuments = 0;
  let processedReferences = 0;
  let successfulDocuments = 0;
  let failedDocuments = 0;
  const failedItems: FailedDocument[] = [];

  for (const [documentPath, references] of documentMap.entries()) {
    try {
      processedDocuments++;
      await Logger.info(`Processing document ${processedDocuments}/${documentMap.size}: ${documentPath} (${references.length} field(s) to update)`);

      // Get the document from core project
      const { document } = await bloomreachService.getDocumentByPath(documentPath);

      // Update all fields for this document
      // Try to update each reference individually to track which ones fail
      const successfulReferences: BrandfolderReferenceWithBdam[] = [];
      const failedReferences: FailedReference[] = [];

      for (const reference of references) {
        try {
          // Create a temporary document with just this reference to test the update
          const testDocument = JSON.parse(JSON.stringify(document));
          updateDocumentFields(testDocument, [reference]);
          successfulReferences.push(reference);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          failedReferences.push({
            attachmentId: reference.attachmentId,
            assetId: reference.assetId,
            fieldPath: reference.fieldPath,
            error: errorMessage,
          });
          await Logger.warn(`Failed to update field ${reference.fieldPath} in document ${documentPath}: ${errorMessage}`);
        }
      }

      // If all references failed, mark the entire document as failed
      if (successfulReferences.length === 0) {
        failedDocuments++;
        failedItems.push({
          documentPath,
          documentId: document.id,
          error: 'All field updates failed',
          references: references.map(ref => ({
            attachmentId: ref.attachmentId,
            assetId: ref.assetId,
            fieldPath: ref.fieldPath,
            error: failedReferences.find(fr => fr.attachmentId === ref.attachmentId)?.error || 'Unknown error',
          })),
        });
        continue;
      }

      // If some references failed, log them but still process the successful ones
      if (failedReferences.length > 0) {
        await Logger.warn(`Document ${documentPath}: ${failedReferences.length} field(s) failed, ${successfulReferences.length} succeeded`);
        failedItems.push({
          documentPath,
          documentId: document.id,
          error: 'Partial failure - some fields updated successfully',
          references: failedReferences,
        });
      }

      // Update document with successful references only
      const updatedDocument = updateDocumentFields(document, successfulReferences);

      // Create NDJSON entry
      const ndjsonEntry = createNdjsonEntry(updatedDocument);
      ndjsonLines.push(JSON.stringify(ndjsonEntry));

      processedReferences += successfulReferences.length;
      successfulDocuments++;

      if (processedDocuments % 10 === 0) {
        await Logger.info(`Processed ${processedDocuments}/${documentMap.size} documents (${processedReferences} field updates)...`);
      }
    } catch (error) {
      failedDocuments++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      await Logger.error(`Failed to process document ${documentPath}: ${errorMessage}`);
      
      failedItems.push({
        documentPath,
        documentId: 'unknown',
        error: errorMessage,
        references: references.map(ref => ({
          attachmentId: ref.attachmentId,
          assetId: ref.assetId,
          fieldPath: ref.fieldPath,
          error: errorMessage,
        })),
      });
    }
  }

  await Logger.info(`Completed processing ${processedDocuments} documents`);

  // Step 5: Write NDJSON file
  let ndjsonContent = '';
  let importResponse = '';
  let importError: string | undefined = undefined;

  if (ndjsonLines.length === 0) {
    await Logger.error('No NDJSON entries to write. All document processing failed.');
    importError = 'No NDJSON entries to import - all document processing failed';
  } else {
    await Logger.info(`Writing ${ndjsonLines.length} NDJSON entries to file...`);
    ndjsonContent = ndjsonLines.join('\n');
    await fs.writeFile(ndjsonFilePath, ndjsonContent, 'utf-8');
    await Logger.success(`NDJSON file created: ${ndjsonFilePath}`);

    // Step 6: Upload NDJSON file to Bloomreach content import endpoint
    await Logger.info('Uploading NDJSON file to Bloomreach content import endpoint...');
    const ndjsonBuffer = Buffer.from(ndjsonContent, 'utf-8');
    
    try {
      const response = await bloomreachService.importContent(bloomreachProjectId, ndjsonBuffer, ndjsonFileName);
      importResponse = await response.text();
      await Logger.success(`Content import completed successfully`);
      await Logger.info(`Response: ${importResponse}`);
    } catch (error) {
      importError = error instanceof Error ? error.message : String(error);
      await Logger.error(`Failed to import content: ${importError}`);
      // Continue to save results even if import failed
    }
  }

  // Step 7: Write results summary (always save, even if import failed)
  const phase3Result: Phase3UpdateResult = {
    generatedAt: new Date().toISOString(),
    bloomreachFolder: bloomreachFolder,
    phase2InputFile: inputFile,
    ndjsonFile: ndjsonFileName,
    projectId: bloomreachProjectId,
    summary: {
      totalDocuments: documentMap.size,
      totalReferences: referencesToUpdate.length,
      processedDocuments: processedDocuments,
      successfulDocuments: successfulDocuments,
      failedDocuments: failedDocuments,
      processedReferences: processedReferences,
    },
    importResponse: importResponse || importError || 'No response',
    importError: importError,
    failedItems: failedItems,
  };

  const resultFileName = `${bloomreachFolder}-bloomreach-updates.json`;
  const resultPath = path.join(phase3Dir, resultFileName);
  await fs.writeFile(resultPath, JSON.stringify(phase3Result, null, 2), 'utf-8');
  await Logger.success(`Update results saved to: ${resultPath}`);

  // Step 8: Display summary
  await Logger.info('\n=== Update Summary ===');
  await Logger.info(`Bloomreach folder: ${bloomreachFolder}`);
  await Logger.info(`Project ID: ${bloomreachProjectId}`);
  await Logger.info(`Total documents: ${documentMap.size}`);
  await Logger.info(`Total references: ${referencesToUpdate.length}`);
  await Logger.info(`Processed documents: ${processedDocuments}`);
  await Logger.info(`Successful documents: ${successfulDocuments}`);
  await Logger.info(`Failed documents: ${failedDocuments}`);
  await Logger.info(`Processed references: ${processedReferences}`);
  await Logger.info(`Success rate: ${documentMap.size > 0 ? ((successfulDocuments / documentMap.size) * 100).toFixed(2) : 0}%`);
  
  if (failedItems.length > 0) {
    await Logger.info(`\nFailed items: ${failedItems.length} document(s) with errors`);
    await Logger.info(`Review the output file for details on failed documents and references`);
  }

  if (importError) {
    await Logger.error(`Content import failed: ${importError}`);
    throw new Error(`Content import failed: ${importError}`);
  }

  await Logger.success('Phase 3 completed successfully');

  // Close file logging if enabled
  if (enableFileLogging) {
    await Logger.closeFileLogging();
  }
}

/**
 * Parse a field path part that may contain an array index
 * Returns { fieldName, arrayIndex } where arrayIndex is -1 if not present
 */
function parseFieldPathPart(part: string): { fieldName: string; arrayIndex: number } {
  const match = part.match(/^(.+)\[(\d+)\]$/);
  if (match) {
    return {
      fieldName: match[1],
      arrayIndex: parseInt(match[2], 10),
    };
  }
  return {
    fieldName: part,
    arrayIndex: -1,
  };
}

/**
 * Update document fields with B-DAM values
 */
function updateDocumentFields(
  document: BloomreachDocument,
  references: BrandfolderReferenceWithBdam[]
): BloomreachDocument {
  // Create a deep copy of the document to avoid mutating the original
  const updatedDocument: BloomreachDocument = JSON.parse(JSON.stringify(document));

  // Process each reference and update the corresponding field
  for (const reference of references) {
    // Parse the bdamValue (it's a stringified JSON array)
    const bdamArray = JSON.parse(reference.bdamValue!);
    if (!Array.isArray(bdamArray) || bdamArray.length === 0) {
      throw new Error(`Invalid bdamValue format for reference ${reference.attachmentId}: expected array with at least one item`);
    }

    // Navigate to the field path and update the value
    // Split by '.' but be careful with array indices
    const pathParts = reference.fieldPath.split('.');
    
    // Start with the root fields array
    let currentFieldsArray: Array<{ name: string; value: unknown[] }> = updatedDocument.fields;
    let currentFieldsObject: Record<string, unknown[]> | null = null;
    let currentValueItem: unknown = null;
    
    // Navigate through nested fields
    for (let i = 0; i < pathParts.length - 1; i++) {
      const pathPart = pathParts[i];
      const { fieldName, arrayIndex } = parseFieldPathPart(pathPart);
      
      // If we're at the root level (fields is an array)
      if (currentFieldsArray.length > 0 && !currentFieldsObject) {
        // Find the field in the current array (case-insensitive match)
        let field = currentFieldsArray.find(f => f.name === fieldName);
        if (!field) {
          // Try case-insensitive match
          field = currentFieldsArray.find(f => f.name.toLowerCase() === fieldName.toLowerCase());
        }
        if (!field) {
          throw new Error(`Field path ${reference.fieldPath} is invalid: ${fieldName} not found at level ${i}. Available fields: ${currentFieldsArray.map(f => f.name).join(', ')}`);
        }
        
        // Get the value array
        if (!Array.isArray(field.value) || field.value.length === 0) {
          throw new Error(`Field path ${reference.fieldPath} is invalid: ${fieldName} has no value array`);
        }
        
        // If array index is specified, use it; otherwise use index 0
        const index = arrayIndex >= 0 ? arrayIndex : 0;
        if (index >= field.value.length) {
          throw new Error(`Field path ${reference.fieldPath} is invalid: ${fieldName} array index ${index} is out of bounds (length: ${field.value.length})`);
        }
        
        // Access the array element: field.value[index]
        // For example: ImageTitleTileItem.value[1]
        currentValueItem = field.value[index];
        
        // Check if this value item has nested fields
        if (typeof currentValueItem !== 'object' || currentValueItem === null || !('fields' in currentValueItem)) {
          throw new Error(`Field path ${reference.fieldPath} is invalid: ${fieldName} value does not have nested fields`);
        }
        
        // Get the nested fields object (not array at this level)
        const nestedFields = (currentValueItem as { fields?: Record<string, unknown[]> }).fields;
        if (!nestedFields || typeof nestedFields !== 'object' || Array.isArray(nestedFields)) {
          throw new Error(`Field path ${reference.fieldPath} is invalid: ${fieldName} nested fields is not an object`);
        }
        
        currentFieldsObject = nestedFields;
        currentFieldsArray = []; // Clear this since we're now in nested fields
      } else if (currentFieldsObject) {
        // We're in nested fields (fields is an object)
        // Check if field exists (case-insensitive)
        let actualFieldName = fieldName;
        if (!(fieldName in currentFieldsObject)) {
          // Try case-insensitive match
          const matchingKey = Object.keys(currentFieldsObject).find(key => key.toLowerCase() === fieldName.toLowerCase());
          if (matchingKey) {
            actualFieldName = matchingKey;
          } else {
            throw new Error(`Field path ${reference.fieldPath} is invalid: ${fieldName} not found in nested fields at level ${i}. Available fields: ${Object.keys(currentFieldsObject).join(', ')}`);
          }
        }
        
        const fieldValue = currentFieldsObject[actualFieldName];
        
        // Validate that fieldValue is an array (in nested fields, values are always arrays)
        if (!Array.isArray(fieldValue)) {
          throw new Error(`Field path ${reference.fieldPath} is invalid: ${fieldName} is not an array in nested fields at level ${i}. Got: ${typeof fieldValue}`);
        }
        
        if (fieldValue.length === 0) {
          throw new Error(`Field path ${reference.fieldPath} is invalid: ${fieldName} array is empty in nested fields at level ${i}`);
        }
        
        // If array index is specified, access that element; otherwise access index 0
        // For example: image[0] or image (defaults to [0])
        const index = arrayIndex >= 0 ? arrayIndex : 0;
        if (index >= fieldValue.length) {
          throw new Error(`Field path ${reference.fieldPath} is invalid: ${fieldName} array index ${index} is out of bounds (length: ${fieldValue.length})`);
        }
        
        // Access the array element: fieldValue[index]
        // For example: fields.image[0]
        currentValueItem = fieldValue[index];
        
        // Check if this value item has nested fields
        if (typeof currentValueItem !== 'object' || currentValueItem === null || !('fields' in currentValueItem)) {
          throw new Error(`Field path ${reference.fieldPath} is invalid: ${fieldName} value does not have nested fields at level ${i}`);
        }
        
        // Get the nested fields object
        const nestedFields = (currentValueItem as { fields?: Record<string, unknown[]> }).fields;
        if (!nestedFields || typeof nestedFields !== 'object' || Array.isArray(nestedFields)) {
          throw new Error(`Field path ${reference.fieldPath} is invalid: ${fieldName} nested fields is not an object at level ${i}`);
        }
        
        currentFieldsObject = nestedFields;
      } else {
        throw new Error(`Field path ${reference.fieldPath} is invalid: unexpected state at level ${i}`);
      }
    }
    
    // Set the final field value
    const finalPathPart = pathParts[pathParts.length - 1];
    const { fieldName: finalFieldName } = parseFieldPathPart(finalPathPart);
    
    if (currentFieldsObject) {
      // We're at the nested level (fields is an object)
      // Check if field exists (case-insensitive)
      let actualFinalFieldName = finalFieldName;
      if (!(finalFieldName in currentFieldsObject)) {
        // Try case-insensitive match
        const matchingKey = Object.keys(currentFieldsObject).find(key => key.toLowerCase() === finalFieldName.toLowerCase());
        if (matchingKey) {
          actualFinalFieldName = matchingKey;
        } else {
          throw new Error(`Field path ${reference.fieldPath} is invalid: ${finalFieldName} not found in nested fields. Available fields: ${Object.keys(currentFieldsObject).join(', ')}`);
        }
      }
      
      // Update the value - cdnImage is an array in the fields object, update it directly
      // The bdamValue is already a stringified JSON array, so we use it directly
      currentFieldsObject[actualFinalFieldName] = [JSON.stringify(bdamArray)];
    } else {
      // We're still at the root level (fields is an array)
      let finalField = currentFieldsArray.find(f => f.name === finalFieldName);
      if (!finalField) {
        // Try case-insensitive match
        finalField = currentFieldsArray.find(f => f.name.toLowerCase() === finalFieldName.toLowerCase());
      }
      if (!finalField) {
        throw new Error(`Field path ${reference.fieldPath} is invalid: ${finalFieldName} not found. Available fields: ${currentFieldsArray.map(f => f.name).join(', ')}`);
      }
      // Update the value
      finalField.value = [JSON.stringify(bdamArray)];
    }
  }

  return updatedDocument;
}

/**
 * Create NDJSON entry from updated document
 */
function createNdjsonEntry(document: BloomreachDocument): NdjsonEntry {
  return {
    type: 'document',
    contentType: document.contentType,
    fields: document.fields,
    name: document.name,
    displayName: document.displayName || document.name,
    path: document.path,
  };
}

/**
 * Read and parse the phase-2 migration file
 */
async function readPhase2File(filePath: string): Promise<Phase2MigrationResult> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const result = JSON.parse(content) as Phase2MigrationResult;
    return result;
  } catch (error) {
    throw new Error(`Failed to read phase-2 file ${filePath}: ${error}`);
  }
}

// Type definitions
interface Phase2MigrationResult {
  generatedAt: string;
  lastUpdated?: string;
  bloomreachFolder: string;
  phase1InventoryFile: string;
  summary: {
    totalReferences: number;
    processed: number;
    successful: number;
    failed: number;
  };
  references: BrandfolderReferenceWithBdam[];
}

interface NdjsonEntry {
  type: 'document';
  contentType: string;
  fields: Array<{
    name: string;
    value: unknown[];
  }>;
  name: string;
  displayName: string;
  path: string;
}

interface FailedReference {
  attachmentId: string;
  assetId: string;
  fieldPath: string;
  error: string;
}

interface FailedDocument {
  documentPath: string;
  documentId: string;
  error: string;
  references: FailedReference[];
}

interface Phase3UpdateResult {
  generatedAt: string;
  bloomreachFolder: string;
  phase2InputFile: string;
  ndjsonFile: string;
  projectId: string;
  summary: {
    totalDocuments: number;
    totalReferences: number;
    processedDocuments: number;
    successfulDocuments: number;
    failedDocuments: number;
    processedReferences: number;
  };
  importResponse: string;
  importError?: string;
  failedItems: FailedDocument[];
}
