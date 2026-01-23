/**
 * API contract types - only what's actually used
 */

export interface ApiResponse<T> {
  data: T
  status: number
  message?: string
}

export interface ApiError {
  message: string
  code?: string
  status?: number
}

export interface ApiCollection {
  id: string
  name: string
  hasResources: boolean
  hasChildren: boolean
}

export interface ApiAsset {
  id: string
  title: string
  thumbnailUrl?: string
  dimensions?: string
  fileExtension?: string
  resourceType?: string
}

export interface ApiAssetDetails {
  id: string
  title: string
  description?: string
  url?: string
  fileExtension?: string
  fileSize?: number
  createdAt?: string
  modifiedAt?: string
}

export interface ApiAssetsSearchResponse {
  items: ApiAsset[]
  page: number
  pageSize: number
  totalCount: number
}

