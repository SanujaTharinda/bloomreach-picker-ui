import { useEffect, useState, useCallback } from 'react'
import { collectionsService } from '../services/collectionsService'
import { useAuthContext } from '../contexts/AuthContext'
import { findCollectionById } from '../utils/assetUtils'
import type { UseCollectionsReturn, Collection } from '../types'

export const useCollections = (): UseCollectionsReturn => {
  const { isAuthenticated, authLoading } = useAuthContext()
  const [collections, setCollections] = useState<Collection[]>([])
  const [collectionsLoading, setCollectionsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null)

  // Load collections
  useEffect(() => {
    const loadCollections = async () => {
      if (!isAuthenticated || authLoading) return

      try {
        setCollectionsLoading(true)
        setError(null)
        const collectionsData = await collectionsService.getCollectionsTree()
        setCollections(collectionsData)
      } catch (err: any) {
        console.error('Failed to load collections:', err)
        setError(`Failed to load collections: ${err.message}`)
      } finally {
        setCollectionsLoading(false)
      }
    }

    loadCollections()
  }, [isAuthenticated, authLoading])

  // Handle collection selection
  const handleSelectCollection = useCallback(
    (collectionId: string) => {
      // Only select leaf collections (collections without children)
      const collection = findCollectionById(collections, collectionId)
      if (collection && !collection.hasChildren) {
        setSelectedCollectionId(collectionId)
      }
    },
    [collections]
  )

  return {
    collections,
    collectionsLoading,
    error,
    selectedCollectionId,
    handleSelectCollection,
    setSelectedCollectionId,
  }
}
