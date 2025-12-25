import { useEffect, useState, useCallback } from 'react'
import { collectionsService } from '../services/collectionsService'
import { useAuthContext } from '../contexts/AuthContext'
import type { UseCollectionsReturn, Collection } from '../types'

export const useCollections = (): UseCollectionsReturn => {
  const { handleAuthError, markAuthVerified, apiKeySet } = useAuthContext()
  const [collections, setCollections] = useState<Collection[]>([])
  const [collectionsLoading, setCollectionsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null)

  // Load root collections only (for lazy loading)
  // Wait for API key to be set before making the call
  useEffect(() => {
    const loadCollections = async () => {
      console.log('Loading collections, apiKeySet:', apiKeySet)
      // Wait for API key to be set before making the call
      if (!apiKeySet) return
      console.log('API key is set, proceeding to load collections')

      try {
        setCollectionsLoading(true)
        setError(null)
        console.log('Calling collectionsService.getRootCollections()')
        const collectionsData = await collectionsService.getRootCollections()
        console.log('Collections loaded', collectionsData)
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
  }, [apiKeySet, handleAuthError, markAuthVerified])

  // Function to load children of a collection (for lazy loading)
  const loadCollectionChildren = useCallback(
    async (collectionId: string): Promise<Collection[]> => {
      try {
        const children = await collectionsService.getCollectionChildren(collectionId)
        return children
      } catch (err: any) {
        console.error(`Failed to load children for collection ${collectionId}:`, err)
        
        // Check if it's an authentication error
        if (err?.status === 401 || err?.status === 403 || err?.code === 'UNAUTHORIZED') {
          if (handleAuthError) {
            handleAuthError(err)
          }
        }
        
        throw err
      }
    },
    [handleAuthError]
  )

  // Handle collection selection
  // Note: CollectionsTree already validates hasResources before calling this,
  // so we can trust that if collectionId is provided, it's valid
  const handleSelectCollection = useCallback(
    (collectionId: string | null) => {
      if (collectionId === null) {
        setSelectedCollectionId(null)
        return
      }
      // CollectionsTree already validated that this collection has resources,
      // so we can directly set it. For nested collections, they may not be
      // in the root collections array, but they're still valid selections.
      setSelectedCollectionId(collectionId)
    },
    []
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
