import { useEffect, useState, useCallback } from 'react'
import { collectionsService } from '../services/collectionsService'
import { authService } from '../services/authService'
import { useAuthContext } from '../contexts/AuthContext'
import { useBloomreachContext } from '../contexts/BloomreachContext'
import { findCollectionById } from '../utils/assetUtils'
import type { UseCollectionsReturn, Collection } from '../types'

export const useCollections = (): UseCollectionsReturn => {
  const { handleAuthError, markAuthVerified } = useAuthContext()
  const { isLoading: extensionLoading } = useBloomreachContext()
  const [collections, setCollections] = useState<Collection[]>([])
  const [collectionsLoading, setCollectionsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null)

  // Load root collections only (for lazy loading)
  // Try loading immediately - auth will be determined by API response
  useEffect(() => {
    const loadCollections = async () => {
      // Wait for extension to load (so API key is available)
      if (extensionLoading) return
      
      // Check if API key is available before making the call
      if (!authService.hasApiKey()) return

      try {
        setCollectionsLoading(true)
        setError(null)
        const collectionsData = await collectionsService.getRootCollections()
        setCollections(collectionsData)
        // Mark authentication as verified after successful API call
        if (markAuthVerified) {
          markAuthVerified()
        }
      } catch (err: any) {
        console.error('Failed to load collections:', err)
        
        // Check if it's an authentication error
        if (err?.status === 401 || err?.status === 403 || err?.code === 'UNAUTHORIZED') {
          if (handleAuthError) {
            handleAuthError(err)
          }
        } else {
          setError(`Failed to load collections: ${err.message}`)
          // Even on non-auth errors, mark auth as verified (we got a response, so API key is valid)
          if (markAuthVerified) {
            markAuthVerified()
          }
        }
      } finally {
        setCollectionsLoading(false)
      }
    }

    loadCollections()
  }, [extensionLoading, handleAuthError, markAuthVerified])

  // Function to load children of a collection (for lazy loading)
  const loadCollectionChildren = useCallback(
    async (collectionId: string): Promise<Collection[]> => {
      try {
        const children = await collectionsService.getCollectionChildren(collectionId)
        return children
      } catch (err: any) {
        console.error(`Failed to load children for collection ${collectionId}:`, err)
        throw err
      }
    },
    []
  )

  // Handle collection selection
  const handleSelectCollection = useCallback(
    (collectionId: string | null) => {
      if (collectionId === null) {
        setSelectedCollectionId(null)
        return
      }
      // Only select leaf collections
      const collection = findCollectionById(collections, collectionId)
      if (collection && collection.isLeaf) {
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
    loadCollectionChildren,
  }
}
