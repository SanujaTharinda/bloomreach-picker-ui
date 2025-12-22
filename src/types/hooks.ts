/**
 * Hook return types
 */

import type { UiScope } from '@bloomreach/ui-extension-saas'
import type { Asset, Collection } from './entities'

export interface UseAuthenticationReturn {
  isAuthenticated: boolean
  authLoading: boolean
  authError: string
}

export interface UseAssetsReturn {
  assets: Asset[]
  assetsLoading: boolean
  error: string | null
  selectedAssetId: string | null
  handleSelectAsset: (asset: Asset) => Promise<void>
  setSelectedAssetId: (id: string | null) => void
}

export interface UseCollectionsReturn {
  collections: Collection[]
  collectionsLoading: boolean
  error: string | null
  selectedCollectionId: string | null
  handleSelectCollection: (collectionId: string) => void
  setSelectedCollectionId: (id: string | null) => void
}

export interface UseBloomreachExtensionReturn {
  ui: UiScope | null
  currentValue: string
  mode: 'view' | 'edit' | 'compare'
  isDialogMode: boolean
  dialogCurrentValue: string
  isLoading: boolean
  error: string
  getApiKey: () => string | null
}

