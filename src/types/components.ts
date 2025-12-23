/**
 * Component prop types
 */

import type { ReactNode } from 'react'
import type { Asset, Collection } from './entities'
import type { BloomreachContextValue } from './bloomreach'
import type { AuthContextValue } from './auth'

export interface AssetGridProps {
  assets: Asset[]
  selectedAssetId: string | null
  onSelectAsset: (asset: Asset) => void
  loading?: boolean
  currentPage?: number
  totalPages?: number
  totalAssets?: number
  onPageChange?: (page: number) => void
}

export interface CollectionsTreeProps {
  collections: Collection[]
  selectedCollectionId: string | null
  onSelectCollection: (collectionId: string | null) => void
  loading?: boolean
  loadCollectionChildren?: (collectionId: string) => Promise<Collection[]>
}

export interface DamPickerLayoutProps {
  collections: Collection[]
  selectedCollectionId: string | null
  assets: Asset[]
  selectedAssetId: string | null
  collectionsLoading: boolean
  assetsLoading: boolean
  onSelectCollection: (collectionId: string | null) => void
  onSelectAsset: (asset: Asset) => void
  // New features
  searchQuery: string
  onSearch: (query: string) => void
  viewAll: boolean
  onViewAllChange: (viewAll: boolean) => void
  currentPage: number
  totalPages: number
  totalAssets: number
  onPageChange: (page: number) => void
  loadCollectionChildren?: (collectionId: string) => Promise<Collection[]>
}

export interface UnauthorizedScreenProps {
  message?: string
}

export interface BloomreachProviderProps {
  value: BloomreachContextValue
  children: ReactNode
}

export interface AuthProviderProps {
  value: AuthContextValue
  children: ReactNode
}

export interface SearchBarProps {
  value: string
  onSearch: (query: string) => void
  placeholder?: string
  loading?: boolean
}

export interface PaginationControlsProps {
  currentPage: number
  totalPages: number
  totalAssets: number
  pageSize: number
  onPageChange: (page: number) => void
  loading?: boolean
}

