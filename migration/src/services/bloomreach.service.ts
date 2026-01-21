import { Logger } from '../utils/logger.js';
import { fetchWithRetry } from '../utils/fetch-with-retry.js';

/**
 * Bloomreach API Service
 * 
 * Handles interactions with the Bloomreach API to identify
 * which Brandfolder content is actually being used
 */
export interface BloomreachDocument {
  id: string;
  path: string;
  name: string;
  displayName?: string;
  locale: string;
  namespace: string;
  contentType: string;
  lastModified: number;
  system?: {
    version?: number;
    [key: string]: unknown;
  };
  links: {
    self: {
      href: string;
    };
  };
  translations?: Array<{
    id: string;
    name: string;
    path: string;
    locale: string;
    channel: string;
    links: {
      self: {
        href: string;
      };
    };
  }>;
  fields: Array<{
    name: string;
    value: unknown[];
  }>;
}

export interface BloomreachDocumentsResponse {
  result: {
    total: number;
    offset: number;
    limit: number;
  };
  documents: BloomreachDocument[];
}

export class BloomreachService {
  private baseUrl: string;
  private apiKey?: string;
  private projectToken?: string;

  constructor(baseUrl: string, apiKey?: string, projectToken?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.projectToken = projectToken;
    // projectToken will be used when update code is uncommented
    void this.projectToken;
  }

  /**
   * Get a page of content that references Brandfolder assets from a specific folder
   * @param folder The Bloomreach folder to query
   * @param offset The offset for pagination
   * @param limit The number of documents per page (default: 100)
   * @returns A response containing documents and pagination info
   */
  async getContentWithBrandfolderAssetsPage(
    folder: string,
    offset: number,
    limit: number = 100
  ): Promise<BloomreachDocumentsResponse> {
    const url = new URL(`${this.baseUrl}/delivery/site/v2/documents`);
    url.searchParams.set('folder', `/${folder}`);
    url.searchParams.set('q', 'bfldr');
    url.searchParams.set('limit', limit.toString());
    url.searchParams.set('offset', offset.toString());

    const response = await fetchWithRetry(url.toString());

    if (!response.ok) {
      throw new Error(
        `Bloomreach API error: ${response.status} ${response.statusText}`
      );
    }

    return (await response.json()) as BloomreachDocumentsResponse;
  }

  /**
   * Get a document by path using Management API (core project)
   * @param documentPath The document path (e.g., "brxsaas/banners/brand-1")
   * @returns The document and X-Resource-Version header value
   */
  async getDocumentByPath(documentPath: string): Promise<{ document: BloomreachDocument; version: string | null }> {
    // Use core Management API endpoint
    // The endpoint format: /management/content/v1/project/core/document/content/documents/{documentPath}
    // Remove leading slash if present
    const cleanPath = documentPath.startsWith('/') ? documentPath.slice(1) : documentPath;
    const url = `${this.baseUrl}/management/content/v1/project/core/document/content/documents/${cleanPath}`;
    
    await Logger.info(`Fetching document from Bloomreach Management API: ${url}`);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.apiKey) {
      headers['X-AUTH-TOKEN'] = this.apiKey;
    }

    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Bloomreach Management API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const document = (await response.json()) as BloomreachDocument;
    
    // Extract X-Resource-Version header (required for updates)
    const version = response.headers.get('X-Resource-Version');
    await Logger.info(`X-Resource-Version header: ${version ?? 'not present'}`);
    
    return { document, version };
  }

  /**
   * Update a document field using Management API
   * @param documentPath The document path (e.g., "brxsaas/banners/brand-1")
   * @param fieldPath The field path (e.g., "cdnImage.cdnImage")
   * @param value The new value to set
   */
  async updateDocumentField(
    documentPath: string,
    fieldPath: string,
    value: unknown
  ): Promise<void> {
    // First, get the current document using the document path
    const { document, version } = await this.getDocumentByPath(documentPath);
    
    // X-Resource-Version header is required for updates
    if (!version) {
      throw new Error('X-Resource-Version header is required for document updates but was not found in the GET response.');
    }

    // Navigate to the field path and update the value
    // Management API structure:
    // - Root: fields = [{name: "fieldName", value: [...]}]
    // - Nested: value[0].fields = {key: [value]} (object, not array)
    // - Final: fields[key][0] is the string to update
    const pathParts = fieldPath.split('.');
    
    // Start with the root fields array
    let currentFieldsArray: Array<{ name: string; value: unknown[] }> = document.fields;
    let currentFieldsObject: Record<string, unknown[]> | null = null;
    
    // Navigate through nested fields
    for (let i = 0; i < pathParts.length - 1; i++) {
      const fieldName = pathParts[i];
      
      // Find the field in the current array
      const field = currentFieldsArray.find(f => f.name === fieldName);
      if (!field) {
        throw new Error(`Field path ${fieldPath} is invalid: ${fieldName} not found at level ${i}`);
      }
      
      // Get the first value item (usually there's only one)
      if (!Array.isArray(field.value) || field.value.length === 0) {
        throw new Error(`Field path ${fieldPath} is invalid: ${fieldName} has no value array`);
      }
      
      const valueItem = field.value[0];
      
      // Check if this value item has nested fields
      if (typeof valueItem !== 'object' || valueItem === null || !('fields' in valueItem)) {
        throw new Error(`Field path ${fieldPath} is invalid: ${fieldName} value does not have nested fields`);
      }
      
      // Get the nested fields object (not array at this level)
      const nestedFields = (valueItem as { fields?: Record<string, unknown[]> }).fields;
      if (!nestedFields || typeof nestedFields !== 'object' || Array.isArray(nestedFields)) {
        throw new Error(`Field path ${fieldPath} is invalid: ${fieldName} nested fields is not an object`);
      }
      
      currentFieldsObject = nestedFields;
      // For the next iteration, we'll need to find a field in this object that has a value array with nested fields
      // But actually, we're now at the nested level where fields is an object, not an array
    }
    
    // Set the final field value
    const finalFieldName = pathParts[pathParts.length - 1];
    
    if (currentFieldsObject) {
      // We're at the nested level (fields is an object)
      if (!(finalFieldName in currentFieldsObject)) {
        throw new Error(`Field path ${fieldPath} is invalid: ${finalFieldName} not found in nested fields`);
      }
      
      // Update the value - it should be an array with a single stringified JSON value
      currentFieldsObject[finalFieldName] = [JSON.stringify([value])];
    } else {
      // We're still at the root level (fields is an array)
      const finalField = currentFieldsArray.find(f => f.name === finalFieldName);
      if (!finalField) {
        throw new Error(`Field path ${fieldPath} is invalid: ${finalFieldName} not found`);
      }
      // Update the value
      finalField.value = [JSON.stringify([value])];
    }

    // Log the retrieved document and the updated document for testing
    await Logger.info(`Retrieved document: ${JSON.stringify(document, null, 2)}`);
    await Logger.info(`Updated document fields (what would be sent): ${JSON.stringify(document.fields, null, 2)}`);
    await Logger.info(`Field ${fieldPath} would be updated to: ${JSON.stringify([value])}`);

    // Build the update payload with only the properties the API accepts
    // Valid properties: contentType, path, fields, locale, name, displayName, system
    const updatePayload: {
      contentType: string;
      path: string;
      fields: Array<{ name: string; value: unknown[] }>;
      locale: string;
      name: string;
      displayName?: string;
      system?: { updatedAt?: string; [key: string]: unknown };
    } = {
      contentType: document.contentType,
      path: document.path,
      fields: document.fields,
      locale: document.locale,
      name: document.name,
    };
    
    // Include displayName if present
    if (document.displayName) {
      updatePayload.displayName = document.displayName;
    }
    
    // Include system property with updatedAt if present
    if (document.system?.updatedAt) {
      updatePayload.system = {
        updatedAt: String(document.system.updatedAt),
      };
    }

    // Update the document using Management API (core project)
    // Use document path for the endpoint (as shown in example: brxsaas/banners/brand-1)
    // Remove leading slash if present
    const cleanPath = documentPath.startsWith('/') ? documentPath.slice(1) : documentPath;
    const url = `${this.baseUrl}/management/content/v1/project/core/document/content/documents/${cleanPath}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.apiKey) {
      headers['X-AUTH-TOKEN'] = this.apiKey;
    }
    
    // X-Resource-Version header is required for optimistic locking
    headers['X-Resource-Version'] = version;
    
    // Log request details for debugging
    await Logger.info(`Updating document via Bloomreach Management API: ${url}`);
    await Logger.info('Request headers:');
    for (const [key, value] of Object.entries(headers)) {
      // Mask the auth token for security
      const displayValue = key === 'X-AUTH-TOKEN' ? `${value.substring(0, 10)}...` : value;
      await Logger.info(`  ${key}: ${displayValue}`);
    }
    await Logger.info('Request payload:');
    await Logger.info(JSON.stringify(updatePayload, null, 2));
    
    const response = await fetchWithRetry(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updatePayload),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Bloomreach Management API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }
  }

  /**
   * Import content using the content import endpoint
   * @param projectId The project ID to import into
   * @param ndjsonFile The NDJSON file to upload
   * @returns The response from the import endpoint
   */
  async importContent(projectId: string, ndjsonFile: Buffer, filename: string): Promise<Response> {
    if (!this.apiKey) {
      throw new Error('API key is required for content import');
    }

    const url = `${this.baseUrl}/management/content-import/v1/project/${projectId}`;
    
    await Logger.info(`Importing content to project ${projectId} via: ${url}`);

    // Create form data
    const formData = new FormData();
    const blob = new Blob([ndjsonFile], { type: 'application/x-ndjson' });
    formData.append('file', blob, filename);

    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'X-AUTH-TOKEN': this.apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Bloomreach Content Import API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response;
  }
}

