import { ParsedArgs, getArg, getFlag } from '../utils/args.js';
import { Logger } from '../utils/logger.js';
import { requireEnv, getOptionalEnv } from '../utils/env.js';
import { BloomreachService } from '../services/bloomreach.service.js';
import { extractBrandfolderReferences } from '../utils/brandfolder-extractor.js';
import { BrandfolderReference } from '../types/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import ExcelJS from 'exceljs';

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
  const allReferences: BrandfolderReference[] = []; // Collect all references for Excel export

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
      allReferences.push(...references); // Collect for Excel export
      
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

  // Generate Excel file
  await Logger.info('Generating Excel file...');
  const excelFileName = `${bloomreachFolder}-brandfolder-inventory.xlsx`;
  const excelFilePath = path.join(phase1Dir, excelFileName);
  await generateExcelReport(
    excelFilePath,
    allReferences,
    {
      bloomreachFolder,
      totalDocuments: processedCount,
      totalReferences: referenceCount,
      uniqueAssetIds: uniqueAssetIds.size,
      uniqueAttachmentIds: uniqueAttachmentIds.size,
      generatedAt: new Date().toISOString(),
    }
  );
  await Logger.success(`Excel file saved to: ${excelFilePath}`);
  
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

/**
 * Extract CDN URL from rawValue JSON string
 */
function extractCdnUrl(rawValue: string): string {
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
 * Generate Excel report with summary and references table
 */
async function generateExcelReport(
  filePath: string,
  references: BrandfolderReference[],
  summary: {
    bloomreachFolder: string;
    totalDocuments: number;
    totalReferences: number;
    uniqueAssetIds: number;
    uniqueAttachmentIds: number;
    generatedAt: string;
  }
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'B-DAM Migration Tool';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Brandfolder Inventory');

  // Add summary section at the top
  worksheet.addRow(['Phase 1: Bloomreach Brandfolder Reference Inventory Report']);
  worksheet.addRow([]);
  worksheet.addRow(['Summary']);
  worksheet.addRow(['Generated At', summary.generatedAt]);
  worksheet.addRow(['Bloomreach Folder', summary.bloomreachFolder]);
  worksheet.addRow(['Total Documents', summary.totalDocuments]);
  worksheet.addRow(['Total References', summary.totalReferences]);
  worksheet.addRow(['Unique Asset IDs', summary.uniqueAssetIds]);
  worksheet.addRow(['Unique Attachment IDs', summary.uniqueAttachmentIds]);
  worksheet.addRow([]);
  worksheet.addRow([]);

  // Style the title
  const titleRow = worksheet.getRow(1);
  titleRow.font = { bold: true, size: 14 };
  
  // Style the summary header
  const summaryHeaderRow = worksheet.getRow(3);
  summaryHeaderRow.font = { bold: true };

  // Add references table header
  const headerRowNumber = 12;
  const headers = [
    'Brandfolder Attachment ID',
    'Brandfolder Asset ID',
    'Bloomreach Document ID',
    'Bloomreach Document Path',
    'Bloomreach Field Path',
    'Brandfolder CDN URL',
    'Raw Value',
  ];
  
  const headerRow = worksheet.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  // Add data rows
  for (const ref of references) {
    worksheet.addRow([
      ref.attachmentId,
      ref.assetId,
      ref.documentId,
      ref.documentPath,
      ref.fieldPath,
      extractCdnUrl(ref.rawValue),
      ref.rawValue,
    ]);
  }

  // Auto-fit columns (approximate widths)
  worksheet.columns = [
    { width: 30 },  // Attachment ID
    { width: 30 },  // Asset ID
    { width: 40 },  // Document ID
    { width: 50 },  // Document Path
    { width: 40 },  // Field Path
    { width: 60 },  // CDN URL
    { width: 80 },  // Raw Value
  ];

  // Add filters to the header row
  worksheet.autoFilter = {
    from: { row: headerRowNumber, column: 1 },
    to: { row: headerRowNumber, column: headers.length },
  };

  // Save the workbook
  await workbook.xlsx.writeFile(filePath);
}
