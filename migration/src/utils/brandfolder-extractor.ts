import { BloomreachDocument } from '../services/bloomreach.service.js';
import { BrandfolderReference } from '../types/index.js';
import { Logger } from './logger.js';

/**
 * Brandfolder attachment data structure from Bloomreach fields
 */
interface BrandfolderAttachment {
  id: string;
  type: string;
  relationships?: {
    asset?: {
      data?: {
        id: string;
        type: string;
      };
    };
  };
  [key: string]: unknown;
}

/**
 * Extract Brandfolder references from a Bloomreach document
 */
export async function extractBrandfolderReferences(
  document: BloomreachDocument
): Promise<BrandfolderReference[]> {
  const references: BrandfolderReference[] = [];

  // Recursively search through all fields for Brandfolder JSON strings
  async function searchFields(
    obj: unknown,
    fieldPath: string,
    documentId: string,
    documentPath: string
  ): Promise<void> {
    if (typeof obj === 'string') {
      // Check if this string contains Brandfolder CDN URLs
      if (obj.includes('cdn.bfldr')) {
        try {
          const parsed = JSON.parse(obj) as BrandfolderAttachment[];
          
          // Process each attachment in the array
          for (const attachment of parsed) {
            if (attachment.id && attachment.relationships?.asset?.data?.id) {
              const reference: BrandfolderReference = {
                attachmentId: attachment.id,
                assetId: attachment.relationships.asset.data.id,
                documentId,
                documentPath,
                fieldPath,
                rawValue: obj,
              };
              
              references.push(reference);
              await Logger.info(
                `Found Brandfolder reference: attachmentId=${reference.attachmentId}, assetId=${reference.assetId}, fieldPath=${reference.fieldPath}, documentId=${reference.documentId}, documentPath=${reference.documentPath}`
              );
            } else {
              await Logger.warn(
                `Found Brandfolder content but missing required fields: attachmentId=${attachment.id || 'missing'}, assetId=${attachment.relationships?.asset?.data?.id || 'missing'}, fieldPath=${fieldPath}, documentId=${documentId}, documentPath=${documentPath}`
              );
            }
          }
        } catch (error) {
          // Not valid JSON, skip
        }
      }
    } else if (Array.isArray(obj)) {
      // Recursively search array elements
      for (let index = 0; index < obj.length; index++) {
        await searchFields(obj[index], `${fieldPath}[${index}]`, documentId, documentPath);
      }
    } else if (obj !== null && typeof obj === 'object') {
      // Recursively search object properties
      for (const [key, value] of Object.entries(obj)) {
        const newPath = fieldPath ? `${fieldPath}.${key}` : key;
        await searchFields(value, newPath, documentId, documentPath);
      }
    }
  }

  // Start searching from the fields object
  await searchFields(document.fields, '', document.id, document.path);

  return references;
}

