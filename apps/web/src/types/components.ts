import type { ReactNode } from 'react'
import type { Asset, Collection } from './entities'
import type { BloomreachContextValue } from './bloomreach'
import type { AuthContextValue } from './auth'

export interface CollectionsTreeProps {
  collections: Collection[]
  selectedCollectionId: string | null
  onSelectCollection: (id: string | null) => void
  loading?: boolean
  loadCollectionChildren?: (id: string) => Promise<Collection[]>
}

export interface AssetGridProps {
  assets: Asset[]
  selectedAssetId: string | null
  onSelectAsset: (asset: Asset) => void
  loading?: boolean
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
