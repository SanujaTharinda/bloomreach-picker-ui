/**
 * Collections service for fetching folder tree structure
 */

import { restApiService } from './restApiService'
import type { Collection } from '../types'
import type { ApiCollection } from '../types/api'

class CollectionsService {
  /**
   * Map API collection to internal Collection type
   */
  private mapApiCollectionToCollection(
    apiCollection: ApiCollection,
    parentId: string | null = null,
    path: string = '/'
  ): Collection {
    return {
      id: apiCollection.id,
      name: apiCollection.name,
      parentId,
      path: path === '/' ? `/${apiCollection.name}` : `${path}/${apiCollection.name}`,
      isLeaf: apiCollection.hasResources, // A collection is a leaf if it has resources/assets (selectable)
      hasChildren: apiCollection.hasChildren, // Whether the collection has child collections (expandable)
    }
  }

  /**
   * Fetch all collections and build a hierarchical tree
   * Note: This method is kept for backward compatibility but is not recommended for large trees
   * Use getRootCollections() and getCollectionChildren() for lazy loading instead
   */
  async getCollectionsTree(): Promise<Collection[]> {
    // For backward compatibility, return root collections
    // In a real scenario, you might want to fetch all collections recursively
    return this.getRootCollections()
  }

  /**
   * Fetch only root collections (for lazy loading)
   */
  async getRootCollections(): Promise<Collection[]> {
    try {
      const response = await restApiService.get<ApiCollection[]>('/collections')
      const apiCollections = response.data

      // Map API collections to internal format
      return apiCollections.map((apiCollection) =>
        this.mapApiCollectionToCollection(apiCollection, null, '/')
      )
    } catch (error: any) {
      console.error('Failed to fetch root collections:', error)
      throw new Error(`Failed to fetch root collections: ${error.message || 'Unknown error'}`)
    }
  }

  /**
   * Fetch children of a specific collection (for lazy loading)
   */
  async getCollectionChildren(collectionId: string): Promise<Collection[]> {
    try {
      const response = await restApiService.get<ApiCollection[]>(`/collections/${collectionId}/children`)
      const apiCollections = response.data

      // Get parent collection to build path (we need to track this, but for now we'll use a simple approach)
      // In a real implementation, you might want to cache parent information
      const parentPath = `/${collectionId}` // Simplified - in reality you'd track the full path

      // Map API collections to internal format
      return apiCollections.map((apiCollection) =>
        this.mapApiCollectionToCollection(apiCollection, collectionId, parentPath)
      )
    } catch (error: any) {
      console.error(`Failed to fetch children for collection ${collectionId}:`, error)
      throw new Error(
        `Failed to fetch collection children: ${error.message || 'Unknown error'}`
      )
    }
  }

  /**
   * Fetch a single collection by ID
   * Note: The API doesn't provide a direct endpoint for this, but we can use it if needed
   */
  async getCollectionById(_collectionId: string): Promise<Collection | null> {
    // The API doesn't provide a direct endpoint for fetching a single collection
    // This would need to be implemented if required, or we could fetch from parent's children
    return null
  }
}

// Export singleton instance
export const collectionsService = new CollectionsService()

