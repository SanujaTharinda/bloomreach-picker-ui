import { ParsedArgs, getArg, getFlag } from '../utils/args.js';
import { Logger } from '../utils/logger.js';
import { requireEnv, getOptionalEnv } from '../utils/env.js';
import { BloomreachService } from '../services/bloomreach.service.js';
import { extractBrandfolderReferences } from '../utils/brandfolder-extractor.js';
import { BrandfolderReference } from '../types/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Build a Bloomreach CMS Brandfolder Reference Inventory
 * 
 * This script scans Bloomreach CMS content to find all references to Brandfolder assets
 * and generates a comprehensive inventory report.
 */
export async function buildBrandfolderInventory(args: ParsedArgs): Promise<void> {
  await Logger.phase('Build Bloomreach CMS Brandfolder Reference Inventory');

  // Get Bloomreach folder from command line arguments
  // Check for --folder or -f flag first, then check positional arguments
  const bloomreachFolder = 
    getArg(args, 'folder') || 
    getArg(args, 'f') || 
    (Array.isArray(args._) && args._.length > 1 ? args._[1] : null);
  
  if (!bloomreachFolder) {
    await Logger.error('Bloomreach folder is required. Use --folder or -f to specify the folder, or pass it as a positional argument.');
    throw new Error('Missing required argument: folder');
  }

  Logger.info(`Processing Bloomreach folder: ${bloomreachFolder}`);

  // Get configuration from environment variables
  const bloomreachApiUrl = requireEnv('BLOOMREACH_API_URL');

  // Get optional configuration
  const baseOutputDir = getOptionalEnv('MIGRATION_OUTPUT_DIR') || './migration-output';
  const phase1Dir = path.join(baseOutputDir, 'phase-1');
  const defaultOutputFile = `${bloomreachFolder}-brandfolder-inventory.json`;
  const outputFile = getOptionalEnv('INVENTORY_OUTPUT_FILE') || defaultOutputFile;
  
  // Initialize file logging if requested
  const enableFileLogging = getFlag(args, 'log-file') || getFlag(args, 'l') || getOptionalEnv('ENABLE_FILE_LOGGING') === 'true';
  if (enableFileLogging) {
    const logFileName = `${bloomreachFolder}-${new Date().toISOString().split('T')[0]}.log`;
    const logFilePath = path.join(phase1Dir, logFileName);
    await Logger.initializeFileLogging(logFilePath);
    await Logger.info(`File logging enabled: ${logFilePath}`);
  }

  // Initialize services
  const bloomreachService = new BloomreachService(bloomreachApiUrl);

  await Logger.info(`Output directory: ${phase1Dir}`);
  await Logger.info(`Output file: ${outputFile}`);

  // Fetch documents from Bloomreach in batches to avoid loading everything into memory
  await Logger.info(`Fetching documents from Bloomreach folder: ${bloomreachFolder}...`);
  
  // Ensure output directory exists
  await fs.mkdir(phase1Dir, { recursive: true });

  const outputPath = path.join(phase1Dir, outputFile);
  
  // Write file header
  await fs.writeFile(
    outputPath,
    `{\n  "generatedAt": "${new Date().toISOString()}",\n  "bloomreachFolder": "${bloomreachFolder}",\n  "references": [\n`,
    'utf-8'
  );

  let offset = 0;
  const limit = 100;
  let total = 0;
  let processedCount = 0;
  let referenceCount = 0;
  const uniqueAssetIds = new Set<string>();
  const uniqueAttachmentIds = new Set<string>();
  let isFirstReference = true;

  do {
    await Logger.info(`Fetching page: offset=${offset}, limit=${limit}...`);
    
    const response = await bloomreachService.getContentWithBrandfolderAssetsPage(
      bloomreachFolder,
      offset,
      limit
    );

    if (total === 0) {
      total = response.result.total;
      await Logger.info(`Total documents found: ${total}`);
    }

    const documents = response.documents;
    
    // Process each document to extract Brandfolder references
    const batchReferences: BrandfolderReference[] = [];
    for (const document of documents) {
      const references = await extractBrandfolderReferences(document);
      batchReferences.push(...references);
      
      for (const ref of references) {
        uniqueAssetIds.add(ref.assetId);
        uniqueAttachmentIds.add(ref.attachmentId);
        referenceCount++;
      }
    }

    // Append this batch to file
    if (batchReferences.length > 0) {
      const batchJson = batchReferences
        .map(ref => '    ' + JSON.stringify(ref))
        .join(',\n');
      
      await fs.appendFile(
        outputPath,
        (isFirstReference ? '' : ',\n') + batchJson,
        'utf-8'
      );
      isFirstReference = false;
    }

    processedCount += documents.length;
    await Logger.info(
      `Processed ${processedCount}/${total} documents. Found ${referenceCount} Brandfolder references so far...`
    );

    offset += limit;
  } while (offset < total);

  await Logger.info(`Completed processing ${processedCount} documents`);
  await Logger.info(`Total Brandfolder references found: ${referenceCount}`);
  await Logger.info(`Unique asset IDs: ${uniqueAssetIds.size}`);
  await Logger.info(`Unique attachment IDs: ${uniqueAttachmentIds.size}`);

    // Append closing and summary
    await fs.appendFile(
      outputPath,
      `\n  ],\n  "summary": {\n    "totalDocuments": ${processedCount},\n    "totalReferences": ${referenceCount},\n    "uniqueAssetIds": ${uniqueAssetIds.size},\n    "uniqueAttachmentIds": ${uniqueAttachmentIds.size}\n  }\n}`,
      'utf-8'
    );

  await Logger.success(`Inventory saved to: ${outputPath}`);
  
  // Generate summary report
  await Logger.info('\n=== Inventory Summary ===');
  await Logger.info(`Bloomreach folder: ${bloomreachFolder}`);
  await Logger.info(`Total documents processed: ${processedCount}`);
  await Logger.info(`Total Brandfolder references: ${referenceCount}`);
  await Logger.info(`Unique asset IDs: ${uniqueAssetIds.size}`);
  await Logger.info(`Unique attachment IDs: ${uniqueAttachmentIds.size}`);

  // Close file logging if enabled
  if (enableFileLogging) {
    await Logger.closeFileLogging();
  }
}
