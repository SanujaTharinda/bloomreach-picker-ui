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
   * Fetch assets for a specific collection
   * For now, returns mock data
   */
  async getAssetsByCollectionId(collectionId: string): Promise<Asset[]> {
    // Mock API call delay
    await new Promise((resolve) => setTimeout(resolve, 400))

    // Mock assets data - different sets for different collections
    const mockAssetsByCollection: Record<string, Asset[]> = {
      'col-3': [
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
      ],
      'col-4': [
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
      ],
      'col-5': [
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
      ],
      'col-6': [
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
      ],
      'col-8': [
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
      ],
      'col-9': [
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
      ],
    }

    // Return assets for the collection, or empty array if collection has no assets
    return mockAssetsByCollection[collectionId] || []
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

