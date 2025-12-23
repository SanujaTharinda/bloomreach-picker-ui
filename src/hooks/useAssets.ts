import { useEffect, useState, useCallback } from 'react'
import { assetsService } from '../services/assetsService'
import { useAuthContext } from '../contexts/AuthContext'
import { useBloomreachContext } from '../contexts/BloomreachContext'
import { serializeAsset, parseAssetIdFromValue } from '../utils/assetUtils'
import type { UseAssetsReturn, Asset } from '../types'

const PAGE_SIZE = 30

export const useAssets = (
  selectedCollectionId: string | null,
  viewAll: boolean = false
): UseAssetsReturn => {
  const { handleAuthError, apiKeySet } = useAuthContext()
  const { ui, isDialogMode, mode, currentValue, dialogCurrentValue } = useBloomreachContext()
  const [assets, setAssets] = useState<Asset[]>([])
  const [assetsLoading, setAssetsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalAssets, setTotalAssets] = useState(0)
  const [pageSize] = useState(PAGE_SIZE)
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')

  // Calculate total pages
  const totalPages = Math.ceil(totalAssets / pageSize) || 1

  // Load assets when dependencies change
  // Wait for API key to be set before making the call
  useEffect(() => {
    const loadAssets = async () => {
      // Wait for API key to be set before making the call
      if (!apiKeySet) return

      // If viewAll is false and no collection selected, don't load
      if (!viewAll && !selectedCollectionId) {
        setAssets([])
        setTotalAssets(0)
        return
      }

      try {
        setAssetsLoading(true)
        setError(null)
        
        const result = await assetsService.getAssets({
          collectionId: viewAll ? null : selectedCollectionId,
          page: currentPage,
          pageSize,
          searchQuery,
          viewAll,
        })
        
        setAssets(result.assets)
        setTotalAssets(result.total)
      } catch (err: any) {
        console.error('Failed to load assets:', err)
        
        // Check if it's an authentication error
        if (err?.status === 401 || err?.status === 403 || err?.code === 'UNAUTHORIZED') {
          if (handleAuthError) {
            handleAuthError(err)
          }
          setAssets([])
          setTotalAssets(0)
        } else {
          setError(`Failed to load assets: ${err.message}`)
          setAssets([])
          setTotalAssets(0)
        }
      } finally {
        setAssetsLoading(false)
      }
    }

    loadAssets()
  }, [selectedCollectionId, apiKeySet, currentPage, searchQuery, viewAll, pageSize, handleAuthError])

  // Reset to page 1 and clear search when collection or view mode changes
  useEffect(() => {
    setCurrentPage(1)
    setSearchQuery('') // Clear search when collection changes
  }, [selectedCollectionId, viewAll])

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  // Determine selected asset from current value
  useEffect(() => {
    const valueToCheck = isDialogMode ? dialogCurrentValue : currentValue
    const assetId = parseAssetIdFromValue(valueToCheck)
    setSelectedAssetId(assetId)
  }, [currentValue, dialogCurrentValue, isDialogMode])

  // Handle asset selection
  const handleSelectAsset = useCallback(
    async (asset: Asset) => {
      if (!ui) {
        console.error('UI extension not initialized')
        return
      }

      setSelectedAssetId(asset.id)

      try {
        // Serialize the asset into the required format
        // Note: serializeAsset will set cdn_url to fullUrl automatically
        const serialized = serializeAsset(asset)
        const serializedValue = JSON.stringify([serialized])

        if (isDialogMode) {
          // In dialog mode, close the dialog and return the value
          await ui.dialog.close(serializedValue)
          console.log('Dialog closed with value:', serializedValue)
        } else {
          // In main mode, check if we're in edit mode
          if (mode !== 'edit') {
            console.warn('Cannot set value in view or compare mode')
            return
          }

          // Set the field value using the UI Extension API
          await ui.document.field.setValue(serializedValue)
          console.log('Successfully set field value:', serializedValue)
        }
      } catch (err: any) {
        console.error('Error setting field value:', err.code, err.message)
        // Reset selection on error
        setSelectedAssetId(null)
        throw err
      }
    },
    [ui, isDialogMode, mode]
  )

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
    // Scroll to top of content area when page changes
    // The scroll will be handled by the component that has the ref
  }, [])

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    // Page will reset to 1 via useEffect
  }, [])

  return {
    assets,
    assetsLoading,
    error,
    selectedAssetId,
    handleSelectAsset,
    setSelectedAssetId,
    // Pagination
    currentPage,
    totalPages,
    totalAssets,
    pageSize,
    handlePageChange,
    // Search
    searchQuery,
    handleSearch,
  }
}
