/**
 * Core domain entities
 */

/**
 * Asset for grid display (from search results)
 */
export interface Asset {
  id: string
  title: string
  thumbnailUrl: string
}

/**
 * Full asset details (from getAssetById) - matches BFF AssetDetail
 */
export interface AssetDetail {
  id: string
  title: string
  description?: string
  url: string
  fileExtension: string
  fileSize: number
  createdAt?: string
  modifiedAt?: string
}

export interface Collection {
  id: string
  name: string
  hasResources: boolean
  hasChildren: boolean
  children?: Collection[]
}

export interface AssetRecord {
  id: string
  title: string
  description?: string
  cdn_url: string
  fileSize: number
  fileExtension: string
  createdAt: string
  modifiedAt: string
}

