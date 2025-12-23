/**
 * API-related types
 */

import type { Asset, Collection } from './entities'

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

// API Response Types
export interface ApiCollection {
  id: string
  name: string
  hasResources: boolean
  hasChildren: boolean
}

export interface ApiAsset {
  id: string
  title: string
  thumbnailUrl: string
  dimensions: string
  fileExtension: string
  resourceType: string
}

export interface ApiAssetDetails {
  id: string
  title: string
  description?: string
  fullUrl: string
  thumbnailUrl: string
  previewUrl?: string
  dimensions: { width: number; height: number }
  fileSize: number
  fileExtension: string
  mimeType: string
  metadata?: {
    keywords?: string
    photographer?: string
    [key: string]: any
  }
  createdAt: string
  modifiedAt: string
}

export interface ApiAssetsSearchResponse {
  items: ApiAsset[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

// Internal types
export interface AssetsResponse {
  assets: Asset[]
  total: number
  page: number
  pageSize: number
}

export interface AssetsQueryParams {
  collectionId?: string | null
  page?: number
  pageSize?: number
  searchQuery?: string
  viewAll?: boolean
}

export interface CollectionsTreeResponse {
  collections: Collection[]
}

