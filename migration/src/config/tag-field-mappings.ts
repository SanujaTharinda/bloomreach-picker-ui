/**
 * Tag to Resource Space Field Mappings Configuration
 * 
 * This configuration maps Brandfolder tags to specific Resource Space metadata fields.
 * Tags that don't match any mapping will be placed in the "keywords" field.
 */

/**
 * Matching strategy for tag-to-field mapping
 * - 'exact': Tag must match exactly (case-insensitive)
 * - 'prefix': Tag must start with a prefix (e.g., "BikeLine: Mountain" → extracts "Mountain")
 * - 'contains': Tag contains the specified string (case-insensitive)
 * - 'values': Tag must be one of the allowed values (maps to the tag value itself)
 */
export type MatchStrategy = 'exact' | 'prefix' | 'contains' | 'values';

/**
 * Configuration for mapping tags to Resource Space fields
 */
export interface TagFieldMapping {
  /** Resource Space field name/ID to update */
  fieldName: string;
  /** Matching strategy */
  strategy: MatchStrategy;
  /** 
   * Match value(s) based on strategy:
   * - 'exact': The exact tag name to match
   * - 'prefix': The prefix to look for (e.g., "BikeLine: ")
   * - 'contains': The substring to look for
   * - 'values': Array of allowed values
   */
  match: string | string[];
  /**
   * Optional: Transform the matched value before setting it
   * - For 'prefix': Extracts the part after the prefix
   * - For 'exact'/'contains': Uses the matched tag name
   * - For 'values': Uses the matched value directly
   */
  transform?: (tag: string, match: string) => string;
  /**
   * Optional: For boolean fields, set this value when the tag is present
   * If not specified, the tag value (or transformed value) is used
   */
  booleanValue?: string;
}

/**
 * Result of categorizing tags
 */
export interface CategorizedTags {
  /** Tags mapped to specific fields: { fieldName: value } */
  fieldValues: Record<string, string>;
  /** Tags that didn't match any mapping (go to keywords) */
  unmatchedTags: string[];
}

/**
 * ============================================
 * CONFIGURE YOUR TAG-TO-FIELD MAPPINGS HERE
 * ============================================
 * 
 * Examples:
 * 
 * 1. Exact match - tag "Electric" sets field "is_electric" to "Yes"
 *    { fieldName: 'is_electric', strategy: 'exact', match: 'Electric', booleanValue: 'Yes' }
 * 
 * 2. Prefix extraction - tag "BikeLine: Mountain" sets field "bike_line" to "Mountain"
 *    { fieldName: 'bike_line', strategy: 'prefix', match: 'BikeLine: ' }
 * 
 * 3. Values list - any of these values sets the "bike_type" field
 *    { fieldName: 'bike_type', strategy: 'values', match: ['Road', 'Mountain', 'Hybrid', 'City'] }
 * 
 * 4. Contains match - any tag containing "2024" sets the "model_year" field
 *    { fieldName: 'model_year', strategy: 'contains', match: '2024' }
 */
export const TAG_FIELD_MAPPINGS: TagFieldMapping[] = [
  // ========== ADD YOUR MAPPINGS BELOW ==========
  
  // Example: Boolean field for electric bikes
  // { 
  //   fieldName: 'is_electric', 
  //   strategy: 'exact', 
  //   match: 'Electric', 
  //   booleanValue: 'Yes' 
  // },
  
  // Example: Bike line extracted from prefix
  // { 
  //   fieldName: 'bike_line', 
  //   strategy: 'prefix', 
  //   match: 'BikeLine: ' 
  // },
  
  // Example: Bike type from predefined values
  // { 
  //   fieldName: 'bike_type', 
  //   strategy: 'values', 
  //   match: ['Road', 'Mountain', 'Hybrid', 'City', 'Gravel', 'E-Bike'] 
  // },
  
  // Example: Model year from any tag containing the year
  // { 
  //   fieldName: 'model_year', 
  //   strategy: 'contains', 
  //   match: '2024' 
  // },

  // ========== ADD YOUR MAPPINGS ABOVE ==========
];

/**
 * Categorize tags based on the configured mappings
 * @param tags Array of Brandfolder tags
 * @returns Object with fieldValues (mapped tags) and unmatchedTags (for keywords)
 */
export function categorizeTags(tags: string[]): CategorizedTags {
  const fieldValues: Record<string, string> = {};
  const unmatchedTags: string[] = [];
  const processedTags = new Set<string>();

  for (const tag of tags) {
    let matched = false;
    const tagLower = tag.toLowerCase();

    for (const mapping of TAG_FIELD_MAPPINGS) {
      const matchResult = checkTagMatch(tag, tagLower, mapping);
      
      if (matchResult.matched) {
        // If this field already has a value, append with comma
        // (handles cases where multiple tags map to the same field)
        if (fieldValues[mapping.fieldName]) {
          fieldValues[mapping.fieldName] += `, ${matchResult.value}`;
        } else {
          fieldValues[mapping.fieldName] = matchResult.value;
        }
        matched = true;
        processedTags.add(tag);
        break; // Stop checking other mappings for this tag
      }
    }

    if (!matched) {
      unmatchedTags.push(tag);
    }
  }

  return { fieldValues, unmatchedTags };
}

/**
 * Check if a tag matches a mapping configuration
 */
function checkTagMatch(
  tag: string, 
  tagLower: string, 
  mapping: TagFieldMapping
): { matched: boolean; value: string } {
  const { strategy, match, booleanValue, transform } = mapping;

  switch (strategy) {
    case 'exact': {
      const matchStr = typeof match === 'string' ? match : match[0];
      if (tagLower === matchStr.toLowerCase()) {
        const value = booleanValue || (transform ? transform(tag, matchStr) : tag);
        return { matched: true, value };
      }
      break;
    }

    case 'prefix': {
      const prefix = typeof match === 'string' ? match : match[0];
      if (tagLower.startsWith(prefix.toLowerCase())) {
        // Extract the part after the prefix
        const extractedValue = tag.substring(prefix.length).trim();
        const value = booleanValue || (transform ? transform(tag, prefix) : extractedValue);
        return { matched: true, value };
      }
      break;
    }

    case 'contains': {
      const substring = typeof match === 'string' ? match : match[0];
      if (tagLower.includes(substring.toLowerCase())) {
        const value = booleanValue || (transform ? transform(tag, substring) : tag);
        return { matched: true, value };
      }
      break;
    }

    case 'values': {
      const allowedValues = Array.isArray(match) ? match : [match];
      for (const allowedValue of allowedValues) {
        if (tagLower === allowedValue.toLowerCase()) {
          const value = booleanValue || (transform ? transform(tag, allowedValue) : tag);
          return { matched: true, value };
        }
      }
      break;
    }
  }

  return { matched: false, value: '' };
}

