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

export interface AssetsResponse {
  assets: Asset[]
  total: number
  page: number
  pageSize: number
}

export interface CollectionsTreeResponse {
  collections: Collection[]
}

