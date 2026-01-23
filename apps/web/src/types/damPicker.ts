import type { Asset, Collection } from './entities'

export interface CollectionPathItem {
  id: string
  name: string
}

export interface DamPickerContextValue {
  collections: Collection[]
  assets: Asset[]
  selectedCollectionId: string | null
  selectedAssetId: string | null
  search: string
  viewAll: boolean
  page: number
  total: number
  totalPages: number
  collectionsLoading: boolean
  assetsLoading: boolean
  error: string | null
  selectCollection: (id: string | null) => void
  selectAsset: (asset: Asset) => Promise<void>
  setSearch: (query: string) => void
  setPage: (page: number) => void
  loadCollectionChildren: (id: string) => Promise<Collection[]>
  getCollectionPath: (id: string) => CollectionPathItem[]
}

