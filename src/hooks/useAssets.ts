import { useEffect, useState, useCallback } from 'react'
import { assetsService } from '../services/assetsService'
import { useAuthContext } from '../contexts/AuthContext'
import { useBloomreachContext } from '../contexts/BloomreachContext'
import { serializeAsset, parseAssetIdFromValue } from '../utils/assetUtils'
import type { UseAssetsReturn, Asset } from '../types'

export const useAssets = (selectedCollectionId: string | null): UseAssetsReturn => {
  const { isAuthenticated } = useAuthContext()
  const { ui, isDialogMode, mode, currentValue, dialogCurrentValue } = useBloomreachContext()
  const [assets, setAssets] = useState<Asset[]>([])
  const [assetsLoading, setAssetsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)

  // Load assets when collection is selected
  useEffect(() => {
    const loadAssets = async () => {
      if (!selectedCollectionId || !isAuthenticated) {
        setAssets([])
        return
      }

      try {
        setAssetsLoading(true)
        setError(null)
        const assetsData = await assetsService.getAssetsByCollectionId(selectedCollectionId)
        setAssets(assetsData)
      } catch (err: any) {
        console.error('Failed to load assets:', err)
        setError(`Failed to load assets: ${err.message}`)
      } finally {
        setAssetsLoading(false)
      }
    }

    loadAssets()
  }, [selectedCollectionId, isAuthenticated])

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

  return {
    assets,
    assetsLoading,
    error,
    selectedAssetId,
    handleSelectAsset,
    setSelectedAssetId,
  }
}
