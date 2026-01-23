import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { ReactNode } from 'react'
import { message } from 'antd'
import { DocumentEditorMode } from '@bloomreach/ui-extension-saas'
import { useAuthContext } from './AuthContext'
import { useBloomreachContext } from './BloomreachContext'
import { assetsService } from '../services/assetsService'
import { collectionsService } from '../services/collectionsService'
import { toAssetRecord } from '../utils/assetUtils'
import type { Asset, Collection } from '../types'
import type { CollectionPathItem, DamPickerContextValue } from '../types/damPicker'

const PAGE_SIZE = 30

const DamPickerContext = createContext<DamPickerContextValue | undefined>(undefined)

export const useDamPickerContext = () => {
  const context = useContext(DamPickerContext)
  if (!context) throw new Error('useDamPickerContext must be used within DamPickerProvider')
  return context
}

export const DamPickerProvider = ({ children }: { children: ReactNode }) => {
  const { handleAuthError, apiKeySet } = useAuthContext()
  const { ui, isDialogMode, mode, selectedAsset, setSelectedAsset } = useBloomreachContext()

  const [collections, setCollections] = useState<Collection[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null)
  const [childrenMap, setChildrenMap] = useState<Map<string, Collection[]>>(new Map())
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [collectionsLoading, setCollectionsLoading] = useState(true)
  const [assetsLoading, setAssetsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const viewAll = selectedCollectionId === null
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1
  const selectedAssetId = selectedAsset?.id ?? null

  const getCollectionPath = useCallback((targetId: string): CollectionPathItem[] => {
    const findPath = (nodes: Collection[], path: CollectionPathItem[] = []): CollectionPathItem[] | null => {
      for (const node of nodes) {
        const newPath = [...path, { id: node.id, name: node.name }]
        if (node.id === targetId) return newPath

        const nodeChildren = childrenMap.get(node.id)
        if (nodeChildren) {
          const found = findPath(nodeChildren, newPath)
          if (found) return found
        }
      }
      return null
    }
    return findPath(collections) || []
  }, [collections, childrenMap])

  // Load collections once
  useEffect(() => {
    if (!apiKeySet) return

    const load = async () => {
      try {
        setCollectionsLoading(true)
        const data = await collectionsService.getRootCollections()
        setCollections(data)
      } catch (err: any) {
        if (err?.status === 401 || err?.status === 403) handleAuthError?.(err)
        else setError(`Failed to load collections: ${err.message}`)
      } finally {
        setCollectionsLoading(false)
      }
    }
    load()
  }, [apiKeySet, handleAuthError])

  // Load assets when collection/page/search changes
  useEffect(() => {
    if (!apiKeySet) return
    if (!viewAll && !selectedCollectionId) {
      setAssets([])
      setTotal(0)
      return
    }

    const load = async () => {
      try {
        setAssetsLoading(true)
        setError(null)
        const result = await assetsService.getAssets({
          collectionId: viewAll ? null : selectedCollectionId,
          page,
          pageSize: PAGE_SIZE,
          searchQuery: search,
          viewAll,
        })
        setAssets(result.assets)
        setTotal(result.total)
      } catch (err: any) {
        if (err?.status === 401 || err?.status === 403) handleAuthError?.(err)
        else setError(`Failed to load assets: ${err.message}`)
        setAssets([])
        setTotal(0)
      } finally {
        setAssetsLoading(false)
      }
    }
    load()
  }, [selectedCollectionId, apiKeySet, page, search, viewAll, handleAuthError])

  // Reset page when collection or search changes
  useEffect(() => { setPage(1) }, [selectedCollectionId, search])

  const selectCollection = useCallback((id: string | null) => {
    setSelectedCollectionId(id)
    setSearch('')
  }, [])

  const selectAsset = useCallback(async (asset: Asset) => {
    if (!ui) {
      message.error('UI extension not initialized')
      return
    }

    try {
      const detail = await assetsService.getAssetById(asset.id)
      if (!detail) {
        message.error(`Asset "${asset.title}" could not be loaded`)
        return
      }

      // Use title from search results (asset.title) as it comes from field8 metadata
      // get_resource_data often returns null title, causing fallback to "Resource {id}"
      const attachment = toAssetRecord({
        ...detail,
        title: asset.title || detail.title,
      })
      const serialized = JSON.stringify([attachment])

      setSelectedAsset(attachment)

      if (isDialogMode) {
        await ui.dialog.close(serialized)
      } else {
        if (mode !== DocumentEditorMode.Edit) {
          message.error('Cannot set value in view mode')
          return
        }
        await ui.document.field.setValue(serialized)
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to select asset'
      if (err?.status === 401 || err?.status === 403) {
        handleAuthError?.(err)
      } else {
        message.error(errorMsg)
      }
    }
  }, [ui, isDialogMode, mode, setSelectedAsset, handleAuthError])

  const loadCollectionChildren = useCallback(async (id: string): Promise<Collection[]> => {
    try {
      const nodeChildren = await collectionsService.getCollectionChildren(id)
      setChildrenMap(prev => new Map(prev).set(id, nodeChildren))
      return nodeChildren
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) handleAuthError?.(err)
      throw err
    }
  }, [handleAuthError])

  const value: DamPickerContextValue = {
    collections,
    assets,
    selectedCollectionId,
    selectedAssetId,
    search,
    viewAll,
    page,
    total,
    totalPages,
    collectionsLoading,
    assetsLoading,
    error,
    selectCollection,
    selectAsset,
    setSearch,
    setPage,
    loadCollectionChildren,
    getCollectionPath,
  }

  return <DamPickerContext.Provider value={value}>{children}</DamPickerContext.Provider>
}
