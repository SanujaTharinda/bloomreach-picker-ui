/**
 * Assets service for fetching assets for a collection
 */

import { restApiService } from './restApiService'
import type { Asset, AssetDetail } from '../types'
import type { ApiAsset, ApiAssetDetails, ApiAssetsSearchResponse } from '../types/api'

class AssetsService {
  /**
   * Fetch assets with pagination, search, and collection filtering
   */
  async getAssets(params: {
    collectionId?: string | null
    page?: number
    pageSize?: number
    searchQuery?: string
    viewAll?: boolean
    signal?: AbortSignal
  }): Promise<{ assets: Asset[]; total: number; page: number; pageSize: number }> {
    const {
      collectionId = null,
      page = 1,
      pageSize = 20,
      searchQuery = '',
      viewAll = false,
      signal,
    } = params

    try {
      // Build common query params
      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      })
      if (searchQuery.trim()) queryParams.append('query', searchQuery.trim())

      const response = viewAll || !collectionId
        ? await restApiService.get<ApiAssetsSearchResponse>(
            `/assets/search?${queryParams.toString()}`,
            signal
          )
        : await restApiService.get<ApiAssetsSearchResponse>(
            `/collections/${collectionId}/assets?${queryParams.toString()}`,
            signal
          )

      const apiResponse = response.data
      const assets = apiResponse.items.map((apiAsset) => this.mapApiAssetToAsset(apiAsset))

      return {
        assets,
        total: apiResponse.totalCount,
        page: apiResponse.page,
        pageSize: apiResponse.pageSize,
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error
      console.error('Failed to fetch assets:', error)
      if (error && typeof error === 'object' && 'status' in error) throw error
      throw new Error(`Failed to fetch assets: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Fetch a single asset by ID
   */
  async getAssetById(assetId: string): Promise<AssetDetail | null> {
    try {
      const response = await restApiService.get<ApiAssetDetails>(`/assets/${assetId}`)
      return this.mapApiAssetDetailsToAssetDetail(response.data)
    } catch (error) {
      console.error(`Failed to fetch asset ${assetId}:`, error)
      if (error && typeof error === 'object' && 'status' in error) {
        if (error.status === 404) return null
        throw error
      }
      throw new Error(`Failed to fetch asset: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private mapApiAssetToAsset(apiAsset: ApiAsset): Asset {
    return {
      id: apiAsset.id,
      title: apiAsset.title,
      thumbnailUrl: apiAsset.thumbnailUrl || '',
    }
  }

  private mapApiAssetDetailsToAssetDetail(apiAssetDetails: ApiAssetDetails): AssetDetail {
    return {
      id: apiAssetDetails.id,
      title: apiAssetDetails.title,
      description: apiAssetDetails.description,
      url: apiAssetDetails.url || '',
      fileExtension: apiAssetDetails.fileExtension || '',
      fileSize: apiAssetDetails.fileSize || 0,
      createdAt: apiAssetDetails.createdAt,
      modifiedAt: apiAssetDetails.modifiedAt,
    }
  }
}

export const assetsService = new AssetsService()

