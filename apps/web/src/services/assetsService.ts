/**
 * Assets service for fetching assets for a collection
 */

import { restApiService } from './restApiService'
import type { Asset } from '../types'
import type { ApiAsset, ApiAssetDetails, ApiAssetsSearchResponse } from '../types/api'

class AssetsService {
  /**
   * Map API asset to internal Asset type
   * Note: Search results don't include fullUrl, so we'll need to fetch details for full asset info
   */
  private mapApiAssetToAsset(apiAsset: ApiAsset): Asset {
    // Parse dimensions string (e.g., "1920 x 1080")
    const dimensionsMatch = apiAsset.dimensions?.match(/(\d+)\s*x\s*(\d+)/i)
    const width = dimensionsMatch ? parseInt(dimensionsMatch[1], 10) : 0
    const height = dimensionsMatch ? parseInt(dimensionsMatch[2], 10) : 0

    // Determine MIME type from file extension
    const mimeTypeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      webp: 'image/webp',
      pdf: 'application/pdf',
    }
    const extension = apiAsset.fileExtension?.toLowerCase() || ''
    const mimeType = mimeTypeMap[extension] || 'application/octet-stream'

    // For search results, we don't have fullUrl, so use thumbnailUrl as placeholder
    // The fullUrl will be available when fetching asset details
    const fullUrl = apiAsset.thumbnailUrl // Will be updated when details are fetched

    return {
      id: apiAsset.id,
      title: apiAsset.title,
      fullUrl,
      thumbnailUrl: apiAsset.thumbnailUrl,
      dimensions: { width, height },
      fileSize: 0, // Not available in search results
      fileExtension: apiAsset.fileExtension || '',
      mimeType,
      createdAt: '', // Not available in search results
      modifiedAt: '', // Not available in search results
      resourceType: apiAsset.resourceType,
      // Legacy aliases for backward compatibility
      url: fullUrl,
      alt: apiAsset.title,
      mimetype: mimeType,
      filename: apiAsset.title,
      width,
      height,
    }
  }

  /**
   * Map API asset details to internal Asset type
   */
  private mapApiAssetDetailsToAsset(apiAssetDetails: ApiAssetDetails): Asset {
    return {
      id: apiAssetDetails.id,
      title: apiAssetDetails.title,
      description: apiAssetDetails.description,
      fullUrl: apiAssetDetails.fullUrl,
      thumbnailUrl: apiAssetDetails.thumbnailUrl,
      previewUrl: apiAssetDetails.previewUrl,
      dimensions: apiAssetDetails.dimensions,
      fileSize: apiAssetDetails.fileSize,
      fileExtension: apiAssetDetails.fileExtension,
      mimeType: apiAssetDetails.mimeType,
      metadata: apiAssetDetails.metadata,
      createdAt: apiAssetDetails.createdAt,
      modifiedAt: apiAssetDetails.modifiedAt,
      // Legacy aliases for backward compatibility
      url: apiAssetDetails.fullUrl,
      alt: apiAssetDetails.title,
      mimetype: apiAssetDetails.mimeType,
      filename: apiAssetDetails.title,
      width: apiAssetDetails.dimensions.width,
      height: apiAssetDetails.dimensions.height,
      size: apiAssetDetails.fileSize,
      updatedAt: apiAssetDetails.modifiedAt,
    }
  }

  /**
   * Fetch assets with pagination, search, and collection filtering
   */
  async getAssets(params: {
    collectionId?: string | null
    page?: number
    pageSize?: number
    searchQuery?: string
    viewAll?: boolean
  }): Promise<{ assets: Asset[]; total: number; page: number; pageSize: number }> {
    const {
      collectionId = null,
      page = 1,
      pageSize = 20,
      searchQuery = '',
      viewAll = false,
    } = params

    try {
      let apiResponse: ApiAssetsSearchResponse

      let response: { data: ApiAssetsSearchResponse }

      if (viewAll || !collectionId) {
        // Search all assets
        const queryParams = new URLSearchParams({
          page: page.toString(),
          pageSize: pageSize.toString(),
        })
        if (searchQuery.trim()) {
          queryParams.append('query', searchQuery.trim())
        }
        response = await restApiService.get<ApiAssetsSearchResponse>(
          `/assets/search?${queryParams.toString()}`
        )
      } else {
        // Get assets for a specific collection
        const queryParams = new URLSearchParams({
          page: page.toString(),
          pageSize: pageSize.toString(),
        })
        response = await restApiService.get<ApiAssetsSearchResponse>(
          `/collections/${collectionId}/assets?${queryParams.toString()}`
        )
      }

      apiResponse = response.data
      

      // Map API assets to internal format
      const assets = apiResponse.items.map((apiAsset) => this.mapApiAssetToAsset(apiAsset))

      return {
        assets,
        total: apiResponse.totalCount,
        page: apiResponse.page,
        pageSize: apiResponse.pageSize,
      }
    } catch (error: any) {
      console.error('Failed to fetch assets:', error)
      throw new Error(`Failed to fetch assets: ${error.message || 'Unknown error'}`)
    }
  }

  /**
   * Fetch assets for a specific collection (backward compatibility)
   */
  async getAssetsByCollectionId(collectionId: string): Promise<Asset[]> {
    const result = await this.getAssets({ collectionId, viewAll: false })
    return result.assets
  }

  /**
   * Fetch a single asset by ID
   */
  async getAssetById(assetId: string): Promise<Asset | null> {
    try {
      const response = await restApiService.get<ApiAssetDetails>(`/assets/${assetId}`)
      return this.mapApiAssetDetailsToAsset(response.data)
    } catch (error: any) {
      console.error(`Failed to fetch asset ${assetId}:`, error)
      // Return null if asset not found, throw for other errors
      if (error.status === 404) {
        return null
      }
      throw new Error(`Failed to fetch asset: ${error.message || 'Unknown error'}`)
    }
  }
}

// Export singleton instance
export const assetsService = new AssetsService()

