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
}

export interface CollectionsTreeProps {
  collections: Collection[]
  selectedCollectionId: string | null
  onSelectCollection: (collectionId: string) => void
  loading?: boolean
}

export interface DamPickerLayoutProps {
  collections: Collection[]
  selectedCollectionId: string | null
  assets: Asset[]
  selectedAssetId: string | null
  collectionsLoading: boolean
  assetsLoading: boolean
  onSelectCollection: (collectionId: string) => void
  onSelectAsset: (asset: Asset) => void
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

