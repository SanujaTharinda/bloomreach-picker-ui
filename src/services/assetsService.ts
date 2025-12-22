/**
 * Assets service for fetching assets for a collection
 */

// @ts-ignore -- Reserved for future API integration
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { restApiService } from './restApiService'
// @ts-ignore -- Reserved for future API integration
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Asset, AssetsResponse } from '../types'

class AssetsService {
  /**
   * Generate mock assets for testing
   */
  private generateMockAssets(): Asset[] {
    return [
      {
        id: 'asset-1',
        url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee',
        alt: 'Mountain landscape banner',
        mimetype: 'image/jpeg',
        filename: 'mountain-banner.jpg',
        width: 1920,
        height: 1080,
        size: 245000,
      },
      {
        id: 'asset-2',
        url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470',
        alt: 'Forest road banner',
        mimetype: 'image/jpeg',
        filename: 'forest-banner.jpg',
        width: 1920,
        height: 1080,
        size: 312000,
      },
      {
        id: 'asset-3',
        url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba',
        alt: 'Sunset banner',
        mimetype: 'image/jpeg',
        filename: 'sunset-banner.jpg',
        width: 1920,
        height: 1080,
        size: 289000,
      },
      {
        id: 'asset-4',
        url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
        alt: 'Ocean waves',
        mimetype: 'image/jpeg',
        filename: 'ocean-social.jpg',
        width: 1080,
        height: 1080,
        size: 156000,
      },
      {
        id: 'asset-5',
        url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e',
        alt: 'Forest path',
        mimetype: 'image/jpeg',
        filename: 'forest-social.jpg',
        width: 1080,
        height: 1080,
        size: 178000,
      },
      {
        id: 'asset-6',
        url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
        alt: 'Hero image 1',
        mimetype: 'image/jpeg',
        filename: 'hero-1.jpg',
        width: 1920,
        height: 1200,
        size: 445000,
      },
      {
        id: 'asset-7',
        url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e',
        alt: 'Hero image 2',
        mimetype: 'image/jpeg',
        filename: 'hero-2.jpg',
        width: 1920,
        height: 1200,
        size: 512000,
      },
      {
        id: 'asset-8',
        url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee',
        alt: 'Thumbnail 1',
        mimetype: 'image/jpeg',
        filename: 'thumb-1.jpg',
        width: 300,
        height: 300,
        size: 45000,
      },
      {
        id: 'asset-9',
        url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470',
        alt: 'Thumbnail 2',
        mimetype: 'image/jpeg',
        filename: 'thumb-2.jpg',
        width: 300,
        height: 300,
        size: 52000,
      },
      {
        id: 'asset-10',
        url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba',
        alt: 'Company logo',
        mimetype: 'image/png',
        filename: 'logo.png',
        width: 500,
        height: 500,
        size: 89000,
      },
      {
        id: 'asset-11',
        url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
        alt: 'Icon set 1',
        mimetype: 'image/svg+xml',
        filename: 'icons-1.svg',
        width: 100,
        height: 100,
        size: 12000,
      },
      {
        id: 'asset-12',
        url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e',
        alt: 'Icon set 2',
        mimetype: 'image/svg+xml',
        filename: 'icons-2.svg',
        width: 100,
        height: 100,
        size: 15000,
      },
      // Add more mock assets for pagination testing
      ...Array.from({ length: 50 }, (_, i) => ({
        id: `asset-${13 + i}`,
        url: `https://images.unsplash.com/photo-${1500530855697 + i}`,
        alt: `Mock asset ${13 + i}`,
        mimetype: 'image/jpeg',
        filename: `mock-asset-${13 + i}.jpg`,
        width: 1920,
        height: 1080,
        size: 200000 + i * 1000,
      })),
    ]
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
    // Mock API call delay
    await new Promise((resolve) => setTimeout(resolve, 400))

    const {
      collectionId = null,
      page = 1,
      pageSize = 30,
      searchQuery = '',
      viewAll = false,
    } = params

    // Generate all mock assets
    let allAssets = this.generateMockAssets()

    // Collection mapping for backward compatibility
    const mockAssetsByCollection: Record<string, Asset[]> = {
      'col-3': allAssets.slice(0, 3),
      'col-4': allAssets.slice(3, 5),
      'col-5': allAssets.slice(5, 7),
      'col-6': allAssets.slice(7, 9),
      'col-8': allAssets.slice(9, 10),
      'col-9': allAssets.slice(10, 12),
    }

    // Filter by collection if not viewing all
    if (!viewAll && collectionId) {
      allAssets = mockAssetsByCollection[collectionId] || []
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      allAssets = allAssets.filter(
        (asset) =>
          asset.filename.toLowerCase().includes(query) ||
          asset.alt.toLowerCase().includes(query) ||
          asset.id.toLowerCase().includes(query)
      )
    }

    // Calculate pagination
    const total = allAssets.length
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedAssets = allAssets.slice(startIndex, endIndex)

    return {
      assets: paginatedAssets,
      total,
      page,
      pageSize,
    }
  }

  /**
   * Fetch assets for a specific collection (backward compatibility)
   * For now, returns mock data
   */
  async getAssetsByCollectionId(collectionId: string): Promise<Asset[]> {
    const result = await this.getAssets({ collectionId, viewAll: false })
    return result.assets
  }

  /**
   * Fetch a single asset by ID
   */
  // @ts-ignore -- Reserved for future API integration
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getAssetById(assetId: string): Promise<Asset | null> {
    // Mock API call
    await new Promise((resolve) => setTimeout(resolve, 200))

    // In real implementation, this would call the API
    return null
  }
}

// Export singleton instance
export const assetsService = new AssetsService()

