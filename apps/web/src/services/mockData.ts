/**
 * Mock data for local development
 */

import type { ApiCollection, ApiAsset, ApiAssetDetails, ApiAssetsSearchResponse } from '../types/api'

// Mock collections with hierarchical structure
const mockCollectionsData: Record<string, ApiCollection[]> = {
  // Root collections
  root: [
    {
      id: '1',
      name: 'Bikes',
      hasResources: false,
      hasChildren: true,
    },
    {
      id: '2',
      name: 'Marketing',
      hasResources: false,
      hasChildren: true,
    },
    {
      id: '3',
      name: 'Product Photos',
      hasResources: true,
      hasChildren: false,
    },
    {
      id: '4',
      name: 'Dealers',
      hasResources: true,
      hasChildren: false,
    },
  ],
  // Children of "Bikes" (id: 1)
  '1': [
    {
      id: '1-1',
      name: 'Folding Bikes',
      hasResources: true,
      hasChildren: false,
    },
    {
      id: '1-2',
      name: 'Electric Bikes',
      hasResources: true,
      hasChildren: false,
    },
    {
      id: '1-3',
      name: 'Accessories',
      hasResources: false,
      hasChildren: true,
    },
  ],
  // Children of "Marketing" (id: 2)
  '2': [
    {
      id: '2-1',
      name: 'Campaigns',
      hasResources: true,
      hasChildren: false,
    },
    {
      id: '2-2',
      name: 'Social Media',
      hasResources: true,
      hasChildren: false,
    },
    {
      id: '2-3',
      name: 'Print Materials',
      hasResources: false,
      hasChildren: true,
    },
  ],
  // Children of "Accessories" (id: 1-3)
  '1-3': [
    {
      id: '1-3-1',
      name: 'Bags',
      hasResources: true,
      hasChildren: false,
    },
    {
      id: '1-3-2',
      name: 'Lights',
      hasResources: true,
      hasChildren: false,
    },
  ],
  // Children of "Print Materials" (id: 2-3)
  '2-3': [
    {
      id: '2-3-1',
      name: 'Brochures',
      hasResources: true,
      hasChildren: false,
    },
    {
      id: '2-3-2',
      name: 'Posters',
      hasResources: true,
      hasChildren: false,
    },
  ],
}

// Mock assets for collections that have resources
const mockAssetsData: Record<string, ApiAsset[]> = {
  '3': [
    {
      id: 'asset-3-1',
      title: 'Brompton Bike Hero Shot.jpg',
      thumbnailUrl: 'https://via.placeholder.com/300x200?text=Bike+Hero',
      dimensions: '1920 x 1080',
      fileExtension: 'jpg',
      resourceType: '1',
    },
    {
      id: 'asset-3-2',
      title: 'Product Detail Close-up.png',
      thumbnailUrl: 'https://via.placeholder.com/300x200?text=Product+Detail',
      dimensions: '1600 x 1200',
      fileExtension: 'png',
      resourceType: '1',
    },
    {
      id: 'asset-3-3',
      title: 'Bike in Urban Setting.jpg',
      thumbnailUrl: 'https://via.placeholder.com/300x200?text=Urban+Bike',
      dimensions: '1920 x 1080',
      fileExtension: 'jpg',
      resourceType: '1',
    },
  ],
  '4': [
    {
      id: 'asset-4-1',
      title: 'Dealer Storefront.jpg',
      thumbnailUrl: 'https://via.placeholder.com/300x200?text=Dealer+Store',
      dimensions: '1920 x 1080',
      fileExtension: 'jpg',
      resourceType: '1',
    },
    {
      id: 'asset-4-2',
      title: 'Dealer Map.png',
      thumbnailUrl: 'https://via.placeholder.com/300x200?text=Dealer+Map',
      dimensions: '1200 x 800',
      fileExtension: 'png',
      resourceType: '1',
    },
  ],
  '1-1': [
    {
      id: 'asset-1-1-1',
      title: 'Folding Bike Closed.jpg',
      thumbnailUrl: 'https://via.placeholder.com/300x200?text=Folding+Closed',
      dimensions: '1920 x 1080',
      fileExtension: 'jpg',
      resourceType: '1',
    },
    {
      id: 'asset-1-1-2',
      title: 'Folding Bike Open.jpg',
      thumbnailUrl: 'https://via.placeholder.com/300x200?text=Folding+Open',
      dimensions: '1920 x 1080',
      fileExtension: 'jpg',
      resourceType: '1',
    },
  ],
  '1-2': [
    {
      id: 'asset-1-2-1',
      title: 'Electric Bike Side View.jpg',
      thumbnailUrl: 'https://via.placeholder.com/300x200?text=Electric+Bike',
      dimensions: '1920 x 1080',
      fileExtension: 'jpg',
      resourceType: '1',
    },
  ],
  '2-1': [
    {
      id: 'asset-2-1-1',
      title: 'Summer Campaign Banner.jpg',
      thumbnailUrl: 'https://via.placeholder.com/300x200?text=Summer+Campaign',
      dimensions: '1920 x 1080',
      fileExtension: 'jpg',
      resourceType: '1',
    },
    {
      id: 'asset-2-1-2',
      title: 'Campaign Logo.png',
      thumbnailUrl: 'https://via.placeholder.com/300x200?text=Campaign+Logo',
      dimensions: '800 x 600',
      fileExtension: 'png',
      resourceType: '1',
    },
  ],
  '2-2': [
    {
      id: 'asset-2-2-1',
      title: 'Instagram Post Template.jpg',
      thumbnailUrl: 'https://via.placeholder.com/300x200?text=Instagram+Post',
      dimensions: '1080 x 1080',
      fileExtension: 'jpg',
      resourceType: '1',
    },
  ],
  '1-3-1': [
    {
      id: 'asset-1-3-1-1',
      title: 'Bike Bag Product Shot.jpg',
      thumbnailUrl: 'https://via.placeholder.com/300x200?text=Bike+Bag',
      dimensions: '1920 x 1080',
      fileExtension: 'jpg',
      resourceType: '1',
    },
  ],
  '1-3-2': [
    {
      id: 'asset-1-3-2-1',
      title: 'Bike Light Set.jpg',
      thumbnailUrl: 'https://via.placeholder.com/300x200?text=Bike+Light',
      dimensions: '1920 x 1080',
      fileExtension: 'jpg',
      resourceType: '1',
    },
  ],
  '2-3-1': [
    {
      id: 'asset-2-3-1-1',
      title: '2024 Brochure Cover.jpg',
      thumbnailUrl: 'https://via.placeholder.com/300x200?text=Brochure',
      dimensions: '1920 x 1080',
      fileExtension: 'jpg',
      resourceType: '1',
    },
  ],
  '2-3-2': [
    {
      id: 'asset-2-3-2-1',
      title: 'Poster Design A.jpg',
      thumbnailUrl: 'https://via.placeholder.com/300x200?text=Poster+A',
      dimensions: '1920 x 1080',
      fileExtension: 'jpg',
      resourceType: '1',
    },
    {
      id: 'asset-2-3-2-2',
      title: 'Poster Design B.jpg',
      thumbnailUrl: 'https://via.placeholder.com/300x200?text=Poster+B',
      dimensions: '1920 x 1080',
      fileExtension: 'jpg',
      resourceType: '1',
    },
  ],
}

// Mock asset details
const mockAssetDetails: Record<string, ApiAssetDetails> = {
  'asset-3-1': {
    id: 'asset-3-1',
    title: 'Brompton Bike Hero Shot.jpg',
    description: 'Professional product photography of Brompton folding bike',
    url: 'https://via.placeholder.com/1920x1080?text=Bike+Hero+Full', // BFF returns 'url', not 'fullUrl'
    thumbnailUrl: 'https://via.placeholder.com/300x200?text=Bike+Hero',
    previewUrl: 'https://via.placeholder.com/800x600?text=Bike+Hero+Preview',
    dimensions: { width: 1920, height: 1080 },
    fileSize: 2456789,
    fileExtension: 'jpg',
    mimeType: 'image/jpeg',
    metadata: {
      keywords: 'bike, brompton, folding, product',
      photographer: 'John Doe',
    },
    createdAt: '2024-01-15T10:30:00Z',
    modifiedAt: '2024-01-15T10:30:00Z',
  },
}

/**
 * Get mock root collections
 */
export const getMockRootCollections = (): ApiCollection[] => {
  return mockCollectionsData.root || []
}

/**
 * Get mock children for a collection
 */
export const getMockCollectionChildren = (collectionId: string): ApiCollection[] => {
  return mockCollectionsData[collectionId] || []
}

/**
 * Get mock assets for a collection
 */
export const getMockCollectionAssets = (
  collectionId: string,
  page: number = 1,
  pageSize: number = 30
): ApiAssetsSearchResponse => {
  const allAssets = mockAssetsData[collectionId] || []
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const items = allAssets.slice(startIndex, endIndex)
  const totalCount = allAssets.length
  const totalPages = Math.ceil(totalCount / pageSize)

  return {
    items,
    page,
    pageSize,
    totalCount,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  }
}

/**
 * Get mock assets from search
 */
export const getMockSearchAssets = (
  query: string,
  page: number = 1,
  pageSize: number = 30
): ApiAssetsSearchResponse => {
  // Simple search: filter assets by title containing query
  const allAssets: ApiAsset[] = Object.values(mockAssetsData).flat()
  const filtered = query
    ? allAssets.filter((asset) => asset.title.toLowerCase().includes(query.toLowerCase()))
    : allAssets

  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const items = filtered.slice(startIndex, endIndex)
  const totalCount = filtered.length
  const totalPages = Math.ceil(totalCount / pageSize)

  return {
    items,
    page,
    pageSize,
    totalCount,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  }
}

/**
 * Get mock asset details
 */
export const getMockAssetDetails = (assetId: string): ApiAssetDetails | null => {
  return mockAssetDetails[assetId] || null
}

