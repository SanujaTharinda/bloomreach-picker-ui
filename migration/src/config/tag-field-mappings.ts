/**
 * Tag to Resource Space Field Mappings Configuration
 * 
 * This configuration maps Brandfolder tags to Resource Space metadata field values.
 * The system automatically determines which field based on the mapped value.
 * 
 * Tags not in the mapping (or with empty values) are ignored completely.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of this module (works with ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Result of categorizing tags
 */
export interface CategorizedTags {
  /** Tags mapped to specific fields: { fieldId: value } */
  fieldValues: Record<number, string>;
}

/**
 * ============================================
 * RESOURCE SPACE FIELD CONFIGURATION
 * ============================================
 * 
 * Loaded from: resourcespace_field_config.json (in migration root folder)
 * 
 * Contains:
 * - standardFields: IDs for title, description (caption) fields
 * - customFields: Custom metadata fields with their IDs and allowed values
 */
interface ResourceSpaceFieldConfig {
  standardFields: {
    title: number;
    description: number;
  };
  customFields: Record<string, { fieldId: number; displayName: string; values: string[] }>;
}

const DEFAULT_FIELD_CONFIG: ResourceSpaceFieldConfig = {
  standardFields: {
    title: 8,       // Default title field ID
    description: 3, // Default caption field ID
  },
  customFields: {},
};

function loadFieldConfig(): ResourceSpaceFieldConfig {
  const configFilePath = path.resolve(__dirname, '../../metadata-config/resourcespace_field_config.json');
  
  try {
    if (fs.existsSync(configFilePath)) {
      const content = fs.readFileSync(configFilePath, 'utf-8');
      const config = JSON.parse(content) as ResourceSpaceFieldConfig;
      const customFieldCount = Object.keys(config.customFields || {}).length;
      console.log(`Loaded ResourceSpace field config from ${configFilePath}`);
      console.log(`  - Standard fields: title=${config.standardFields?.title}, description=${config.standardFields?.description}`);
      console.log(`  - Custom fields: ${customFieldCount}`);
      return {
        standardFields: { ...DEFAULT_FIELD_CONFIG.standardFields, ...config.standardFields },
        customFields: config.customFields || {},
      };
    } else {
      console.warn(`Field config file not found: ${configFilePath}. Using defaults.`);
      return DEFAULT_FIELD_CONFIG;
    }
  } catch (error) {
    console.error(`Failed to load field config from ${configFilePath}:`, error);
    return DEFAULT_FIELD_CONFIG;
  }
}

const FIELD_CONFIG = loadFieldConfig();

/**
 * Standard ResourceSpace field IDs
 * Configurable via resourcespace_field_config.json
 */
export const STANDARD_FIELD_IDS = {
  title: FIELD_CONFIG.standardFields.title,
  description: FIELD_CONFIG.standardFields.description,
} as const;

/**
 * Custom ResourceSpace field definitions
 * Configurable via resourcespace_field_config.json
 */
export const RESOURCESPACE_FIELDS = FIELD_CONFIG.customFields;

/**
 * ============================================
 * BRANDFOLDER TAG TO RESOURCE SPACE VALUE MAPPING
 * ============================================
 * 
 * Loaded from: brandfolder_b_dam_metadata_mapping.json (in migration root folder)
 * 
 * Maps Brandfolder tags to Resource Space field values.
 * - Key: Brandfolder tag (case-insensitive matching)
 * - Value: Resource Space field value (the system determines which field by ID)
 * 
 * Logic:
 * - Tag with non-empty value → Maps to the appropriate field
 * - Tag with empty value ('') → Ignored
 * - Tag NOT in this mapping → Ignored
 * 
 * Only tags explicitly mapped to a Resource Space value will be processed.
 */
function loadTagMapping(): Record<string, string> {
  // Path to the mapping file (in metadata-config folder)
  const mappingFilePath = path.resolve(__dirname, '../../metadata-config/brandfolder_b_dam_metadata_mapping.json');
  
  try {
    if (fs.existsSync(mappingFilePath)) {
      const content = fs.readFileSync(mappingFilePath, 'utf-8');
      const data = JSON.parse(content);
      // Handle both formats: { mapping: {...} } or direct { tag: value }
      const mapping = data.mapping || data;
      console.log(`Loaded ${Object.keys(mapping).length} tag mappings from ${mappingFilePath}`);
      return mapping as Record<string, string>;
    } else {
      console.warn(`Tag mapping file not found: ${mappingFilePath}. Using empty mapping.`);
      return {};
    }
  } catch (error) {
    console.error(`Failed to load tag mapping from ${mappingFilePath}:`, error);
    return {};
  }
}

export const BRANDFOLDER_B_DAM_TAG_MAPPING: Record<string, string> = loadTagMapping();

/**
 * Build a reverse lookup: Resource Space value -> field ID
 */
function buildValueToFieldLookup(): Map<string, number> {
  const lookup = new Map<string, number>();
  
  for (const field of Object.values(RESOURCESPACE_FIELDS)) {
    for (const value of field.values) {
      lookup.set(value.toLowerCase(), field.fieldId);
    }
  }
  
  return lookup;
}

// Pre-build lookups for performance
const VALUE_TO_FIELD_LOOKUP = buildValueToFieldLookup();
const TAG_MAPPING_LOWER = new Map(
  Object.entries(BRANDFOLDER_B_DAM_TAG_MAPPING).map(([tag, value]) => [tag.toLowerCase(), value])
);

/**
 * Categorize tags based on the configured mappings
 * @param tags Array of Brandfolder tags
 * @returns Object with fieldValues (mapped tags to Resource Space field IDs)
 * 
 * Logic:
 * - Tag in mapping with value → Maps to the appropriate Resource Space field ID
 * - Tag in mapping with '' → Ignored
 * - Tag NOT in mapping → Ignored
 */
export function categorizeTags(tags: string[]): CategorizedTags {
  const fieldValues: Record<number, string> = {};

  for (const tag of tags) {
    const tagLower = tag.toLowerCase();
    
    // Check if tag is in our mapping
    if (TAG_MAPPING_LOWER.has(tagLower)) {
      const resourceSpaceValue = TAG_MAPPING_LOWER.get(tagLower)!;
      
      if (resourceSpaceValue === '') {
        // Empty mapping = ignore this tag completely
        continue;
      }
      
      // Find which field ID this value belongs to
      const fieldId = VALUE_TO_FIELD_LOOKUP.get(resourceSpaceValue.toLowerCase());
      
      if (fieldId !== undefined) {
        // Add to the appropriate field
        if (fieldValues[fieldId]) {
          fieldValues[fieldId] += `, ${resourceSpaceValue}`;
        } else {
          fieldValues[fieldId] = resourceSpaceValue;
        }
      }
    }
  }

  return { fieldValues };
}

/**
 * Build metadata object for ResourceSpace create_resource API
 * Combines standard fields (title, caption) with custom field mappings
 * 
 * @param title Asset title
 * @param description Asset description (from Brandfolder) → maps to caption in ResourceSpace
 * @param customFields Mapped tag values by field ID
 * @returns JSON string for metadata parameter
 */
export function buildResourceMetadata(
  title: string,
  description: string,
  customFields: Record<number, string>
): string {
  const metadata: Record<number, string> = {
    [STANDARD_FIELD_IDS.title]: title,
  };

  // Map Brandfolder description to ResourceSpace caption field
  if (description) {
    metadata[STANDARD_FIELD_IDS.description] = description;
  }

  // Add custom fields from tag mappings
  for (const [fieldId, value] of Object.entries(customFields)) {
    if (value) {
      metadata[parseInt(fieldId, 10)] = value;
    }
  }

  return JSON.stringify(metadata);
}

/**
 * Legacy export for backward compatibility
 */
export const TAG_FIELD_MAPPINGS = Object.values(RESOURCESPACE_FIELDS);
