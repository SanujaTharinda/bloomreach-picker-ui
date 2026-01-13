import { buildSignedUrl, buildQueryStringForDebug } from '../utils/resourcespace-signature.js';
import { generateSignature } from '../utils/resourcespace-signature.js';
import { Logger } from '../utils/logger.js';

/**
 * Resource Space API Service
 * 
 * Handles interactions with the Resource Space API
 */
export interface ResourceSpaceResourceData {
  ref: number;
  title?: string;
  description?: string;
  file_extension?: string;
  file_size?: number;
  resource_type?: number;
  creation_date?: string;
  modified?: string;
  image_red_width?: number;
  image_red_height?: number;
  thumb_width?: number;
  thumb_height?: number;
  [key: string]: unknown;
}

export interface ResourceSpaceCollection {
  ref: number;
  name?: string;
  type?: number;
  parent?: number;
  created?: string;
  order_by?: number;
  thumbnail_selection_method?: number;
  bg_img_resource_ref?: number;
  savedsearch?: string;
  has_resources?: number;
  has_children?: number;
  [key: string]: unknown;
}

export interface BdamResponse {
  id: string;
  title: string;
  description?: string;
  full_url: string;
  cdn_url: string;
  dimensions: { width: number; height: number };
  fileSize: number;
  fileExtension: string;
  mimeType: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  modifiedAt: string;
}

export class ResourceSpaceService {
  private apiKey: string;
  private baseUrl: string;
  private defaultUser: string;

  constructor(baseUrl: string, apiKey: string, defaultUser: string = 'admin') {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.defaultUser = defaultUser;
  }

  /**
   * Create an empty resource in Resource Space
   * Uses create_resource API without url parameter
   * @param resourceType The resource type ID (default: 1 for Photo)
   * @param metadata Optional metadata as JSON string
   * @returns The resource ID (ref)
   */
  async createResource(
    resourceType: number = 1,
    metadata?: string
  ): Promise<number> {
    const parameters: Record<string, string> = {
      resource_type: resourceType.toString(),
      archive: '0', // Active
    };

    if (metadata) {
      parameters.metadata = metadata;
    }

    const url = buildSignedUrl(
      this.baseUrl,
      this.defaultUser,
      this.apiKey,
      'create_resource',
      parameters
    );

    // Log the API call (without sensitive data)
    await Logger.info(`Calling ResourceSpace create_resource API with resource_type=${resourceType}`);
    // Log the base URL and user for debugging (without API key)
    await Logger.info(`ResourceSpace base URL: ${this.baseUrl}, user: ${this.defaultUser}`);
    // Log query string for debugging (without signature)
    const queryStringForDebug = buildQueryStringForDebug(this.defaultUser, 'create_resource', parameters);
    await Logger.info(`Query string (without signature): ${queryStringForDebug}`);

    const response = await fetch(url);
    
    // Get response text first (can only read once)
    const responseText = await response.text();
    const trimmedResponse = responseText.trim();

    if (!response.ok) {
      await Logger.error(`ResourceSpace API HTTP error: ${response.status} ${response.statusText}`);
      await Logger.error(`Response body: ${responseText}`);
      throw new Error(
        `ResourceSpace API error: ${response.status} ${response.statusText} - ${responseText}`
      );
    }

    // Log the full response for debugging
    await Logger.info(`ResourceSpace API response: ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`);

    // ResourceSpace returns "false" as a string when the operation fails
    if (trimmedResponse === 'false' || trimmedResponse === 'null' || trimmedResponse === '') {
      // Try to get more error details - check response headers or try to parse as JSON
      let errorDetails = '';
      try {
        // Sometimes ResourceSpace returns error details in JSON format
        const jsonResponse = JSON.parse(responseText);
        if (jsonResponse.error || jsonResponse.message) {
          errorDetails = ` Error details: ${JSON.stringify(jsonResponse)}`;
        }
      } catch {
        // Not JSON, that's fine
      }

      // Check for common error patterns in the response
      if (responseText.includes('error') || responseText.includes('Error') || responseText.includes('failed')) {
        errorDetails = ` Full response: ${responseText}`;
      }

      // Log response headers for additional debugging
      const responseHeaders: string[] = [];
      response.headers.forEach((value, key) => {
        responseHeaders.push(`${key}: ${value}`);
      });
      await Logger.error(`Response headers: ${responseHeaders.join(', ')}`);

      await Logger.error(`ResourceSpace API returned false.${errorDetails}`);
      await Logger.error(`Request URL (without signature): ${url.split('&sign=')[0]}`);
      
      throw new Error(
        `ResourceSpace API returned false.${errorDetails || ' Possible causes: invalid API key, invalid user, URL not accessible from ResourceSpace server, or invalid resource type.'}`
      );
    }

    const parsedId = parseInt(trimmedResponse, 10);

    if (isNaN(parsedId) || parsedId <= 0) {
      throw new Error(
        `Invalid resource ID returned: ${trimmedResponse}. Expected a positive integer.`
      );
    }

    return parsedId;
  }

  /**
   * Upload a file to an existing Resource Space resource
   * Uses upload_multipart API with multipart form data
   * @param resourceId The resource ID to upload the file to
   * @param fileBuffer The file buffer to upload
   * @param filename The filename
   * @param mimetype Optional MIME type of the file
   * @param resourceType Optional resource type (1=Photo, 2=Document, 3=Video, 4=Audio)
   * @returns void (throws on error)
   */
  async uploadFileToResource(
    resourceId: number,
    fileBuffer: Buffer,
    filename: string,
    mimetype?: string,
    resourceType?: number
  ): Promise<void> {
    await Logger.info(`Uploading file to Resource Space resource ${resourceId}: ${filename}`);

    // Build query string for upload_multipart
    // Skip EXIF processing for Document type (type 2) and SVG files
    // EXIF is only relevant for raster image files (not SVG)
    // SVG files may cause errors if EXIF processing is attempted
    const isSvg = mimetype && (mimetype.toLowerCase() === 'image/svg+xml' || mimetype.toLowerCase() === 'image/svg');
    const skipExif = resourceType === 2 || isSvg;
    if (isSvg) {
      await Logger.info(`Detected SVG file - skipping EXIF processing (no_exif=1)`);
    }
    const parameters: Record<string, string> = {
      ref: resourceId.toString(),
      no_exif: skipExif ? '1' : '0',
      revert: '0', // Not reverting existing file
    };

    const queryString = buildQueryStringForDebug(this.defaultUser, 'upload_multipart', parameters);
    const signature = generateSignature(this.apiKey, queryString);

    // Build the API URL (without query params, as they go in the form)
    const apiUrl = `${this.baseUrl.replace(/\/+$/, '')}/api/`;

    // Create FormData for multipart upload
    const formData = new FormData();
    formData.append('query', queryString);
    formData.append('sign', signature);
    formData.append('user', this.defaultUser);
    
    // Create a Blob from the buffer with the correct MIME type
    // For SVG files, try using the original image/svg+xml MIME type
    // Resource Space should handle it correctly if the resource type matches
    let blobType = mimetype || 'application/octet-stream';
    if (isSvg) {
      // Try using the original SVG MIME type
      blobType = 'image/svg+xml';
      await Logger.info(`Using blob type 'image/svg+xml' for SVG file`);
    }
    const blob = new Blob([fileBuffer], { type: blobType });
    formData.append('file', blob, filename);

    await Logger.info(`Uploading file via multipart form to Resource Space...`);
    await Logger.info(`  - Filename: ${filename}`);
    await Logger.info(`  - Blob type: ${blobType}`);
    await Logger.info(`  - Resource type: ${resourceType}`);
    await Logger.info(`  - File size: ${fileBuffer.length} bytes`);
    await Logger.info(`  - Parameters: ref=${parameters.ref}, no_exif=${parameters.no_exif}, revert=${parameters.revert}`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      await Logger.error(`ResourceSpace upload_multipart HTTP error: ${response.status} ${response.statusText}`);
      await Logger.error(`Response body: ${errorText}`);
      throw new Error(
        `ResourceSpace upload_multipart API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    // upload_multipart returns empty body on success (HTTP 200 or 204)
    const responseText = await response.text();
    await Logger.info(`File uploaded successfully to resource ${resourceId}`);
    
    if (responseText && responseText.trim() !== '' && responseText.trim() !== 'true') {
      await Logger.warn(`Unexpected response from upload_multipart: ${responseText}`);
    }
  }

  /**
   * Get resource data by reference ID
   * Uses get_resource_data API
   */
  async getResourceData(ref: number): Promise<ResourceSpaceResourceData> {
    // ResourceSpace get_resource_data API uses 'resource' parameter, not 'ref'
    const parameters: Record<string, string> = {
      resource: ref.toString(),
    };

    const url = buildSignedUrl(
      this.baseUrl,
      this.defaultUser,
      this.apiKey,
      'get_resource_data',
      parameters
    );

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `ResourceSpace API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = (await response.json()) as ResourceSpaceResourceData;
    
    // Log the response for debugging
    await Logger.info(`get_resource_data response: ${JSON.stringify(data).substring(0, 300)}...`);
    
    // Ensure ref is set (ResourceSpace might not include it in the response)
    if (!data.ref && ref) {
      data.ref = ref;
    }
    
    return data;
  }

  /**
   * Get resource full URL (original quality)
   * Uses get_resource_path API
   */
  async getResourceFullUrl(ref: number): Promise<string> {
    const fullUrlParams: Record<string, string> = {
      ref: ref.toString(),
      getfilepath: 'false',
      size: 'original', // Empty string to get the original uploaded file (not processed/resized)
      generate: 'false',
    };

    const fullUrlApi = buildSignedUrl(
      this.baseUrl,
      this.defaultUser,
      this.apiKey,
      'get_resource_path',
      fullUrlParams
    );

    const fullUrlResponse = await fetch(fullUrlApi);
    if (!fullUrlResponse.ok) {
      throw new Error(`Failed to get full URL: ${fullUrlResponse.statusText}`);
    }
    let fullUrl = await fullUrlResponse.text();
    fullUrl = fullUrl.trim().replace(/^"|"$/g, ''); // Remove quotes if present
    return fullUrl;
  }

  /**
   * Get complete resource information formatted for B-DAM response
   */
  async getResourceForBdam(ref: number): Promise<BdamResponse> {
    const [resourceData, fullUrl] = await Promise.all([
      this.getResourceData(ref),
      this.getResourceFullUrl(ref),
    ]);

    // Log resource data for debugging
    await Logger.info(`Resource data received: ${JSON.stringify(resourceData).substring(0, 200)}...`);

    // Use ref parameter if resourceData.ref is not available
    const resourceId = resourceData.ref ?? ref;

    // Map ResourceSpace data to B-DAM response format
    // Use full_url (original quality) for both full_url and cdn_url
    return {
      id: resourceId.toString(),
      title: resourceData.title || '',
      description: resourceData.description || undefined,
      full_url: fullUrl,
      cdn_url: fullUrl, // Use original quality URL for cdn_url as well
      dimensions: {
        // Use image_red dimensions if available (full size), otherwise fall back to thumb
        // Note: image_red might be a processed size, not original
        width: resourceData.image_red_width || resourceData.thumb_width || 0,
        height: resourceData.image_red_height || resourceData.thumb_height || 0,
      },
      fileSize: resourceData.file_size || 0,
      fileExtension: resourceData.file_extension || '',
      mimeType: this.getMimeTypeFromExtension(resourceData.file_extension || ''),
      metadata: {},
      createdAt: resourceData.creation_date || new Date().toISOString(),
      modifiedAt: resourceData.modified || new Date().toISOString(),
    };
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeTypeFromExtension(extension: string): string {
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      webp: 'image/webp',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      pdf: 'application/pdf',
    };

    const ext = extension.toLowerCase().replace(/^\./, '');
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Get featured collections (optionally filtered by parent)
   * Uses get_featured_collections API
   */
  async getFeaturedCollections(parent: number = 0): Promise<ResourceSpaceCollection[]> {
    const parameters: Record<string, string> = {
      parent: parent.toString(),
    };

    const url = buildSignedUrl(
      this.baseUrl,
      this.defaultUser,
      this.apiKey,
      'get_featured_collections',
      parameters
    );

    await Logger.info(`Fetching featured collections with parent=${parent}`);

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      await Logger.error(`ResourceSpace get_featured_collections API error: ${response.status} ${response.statusText}`);
      await Logger.error(`Response body: ${errorText}`);
      throw new Error(
        `ResourceSpace API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const responseText = await response.text();
    const trimmedResponse = responseText.trim();

    if (trimmedResponse === 'false' || trimmedResponse === 'null' || trimmedResponse === '') {
      await Logger.info(`No collections found for parent=${parent}`);
      return [];
    }

    try {
      const collections = JSON.parse(responseText) as ResourceSpaceCollection[];
      await Logger.info(`Found ${collections.length} collections for parent=${parent}`);
      return collections;
    } catch (error) {
      await Logger.error(`Failed to parse collections response: ${responseText}`);
      throw new Error(`Failed to parse collections response: ${error}`);
    }
  }

  /**
   * Find a collection by name (searches in a specific parent collection)
   * @param name The collection name to search for
   * @param parent The parent collection ID (default: 0 for root)
   * @returns The collection ID if found, null otherwise
   */
  async findCollectionByName(name: string, parent: number = 0): Promise<number | null> {
    await Logger.info(`Searching for collection "${name}" in parent=${parent}`);
    
    const collections = await this.getFeaturedCollections(parent);
    
    const found = collections.find(c => c.name?.toLowerCase() === name.toLowerCase());
    
    if (found) {
      await Logger.info(`Found collection "${name}" with ID: ${found.ref}`);
      return found.ref;
    }
    
    await Logger.info(`Collection "${name}" not found in parent=${parent}`);
    return null;
  }

  /**
   * Create a collection in Resource Space
   * Uses create_collection API
   * @param name The collection name
   * @param parent The parent collection ID (default: 0 for root)
   * @param description Optional description
   * @returns The collection ID (ref)
   */
  async createCollection(
    name: string,
    parent: number = 0,
    description?: string
  ): Promise<number> {
    // First check if collection already exists
    const existing = await this.findCollectionByName(name, parent);
    if (existing !== null) {
      await Logger.info(`Collection "${name}" already exists with ID: ${existing}`);
      return existing;
    }

    await Logger.info(`Creating collection "${name}" in parent=${parent}`);

    const parameters: Record<string, string> = {
      name,
      parent: parent.toString(),
    };

    if (description) {
      parameters.description = description;
    }

    const url = buildSignedUrl(
      this.baseUrl,
      this.defaultUser,
      this.apiKey,
      'create_collection',
      parameters
    );

    const response = await fetch(url);
    
    const responseText = await response.text();
    const trimmedResponse = responseText.trim();

    if (!response.ok) {
      await Logger.error(`ResourceSpace create_collection API HTTP error: ${response.status} ${response.statusText}`);
      await Logger.error(`Response body: ${responseText}`);
      throw new Error(
        `ResourceSpace API error: ${response.status} ${response.statusText} - ${responseText}`
      );
    }

    // ResourceSpace returns "false" as a string when the operation fails
    if (trimmedResponse === 'false' || trimmedResponse === 'null' || trimmedResponse === '') {
      await Logger.error(`ResourceSpace API returned false when creating collection "${name}"`);
      throw new Error(
        `ResourceSpace API returned false when creating collection "${name}". Possible causes: invalid API key, invalid user, or invalid parent collection.`
      );
    }

    const parsedId = parseInt(trimmedResponse, 10);

    if (isNaN(parsedId) || parsedId <= 0) {
      throw new Error(
        `Invalid collection ID returned: ${trimmedResponse}. Expected a positive integer.`
      );
    }

    await Logger.info(`Created collection "${name}" with ID: ${parsedId}`);
    return parsedId;
  }

  /**
   * Add a resource to a collection
   * Uses add_resource_to_collection API
   * @param collectionId The collection ID
   * @param resourceRef The resource ID (ref)
   */
  async addResourceToCollection(
    collectionId: number,
    resourceRef: number
  ): Promise<void> {
    await Logger.info(`Adding resource ${resourceRef} to collection ${collectionId}`);

    const parameters: Record<string, string> = {
      collection: collectionId.toString(),
      resource: resourceRef.toString(),
    };

    const url = buildSignedUrl(
      this.baseUrl,
      this.defaultUser,
      this.apiKey,
      'add_resource_to_collection',
      parameters
    );

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      await Logger.error(`ResourceSpace add_resource_to_collection API HTTP error: ${response.status} ${response.statusText}`);
      await Logger.error(`Response body: ${errorText}`);
      throw new Error(
        `ResourceSpace API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const responseText = await response.text();
    const trimmedResponse = responseText.trim();

    // ResourceSpace returns "true" on success, "false" on failure
    if (trimmedResponse === 'false' || trimmedResponse === 'null' || trimmedResponse === '') {
      await Logger.error(`ResourceSpace API returned false when adding resource ${resourceRef} to collection ${collectionId}`);
      throw new Error(
        `ResourceSpace API returned false when adding resource to collection. Possible causes: invalid collection ID, invalid resource ID, or resource already in collection.`
      );
    }

    await Logger.info(`Successfully added resource ${resourceRef} to collection ${collectionId}`);
  }
}

