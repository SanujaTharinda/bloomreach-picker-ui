/**
 * Collections service for fetching folder tree structure
 */

import { restApiService } from './restApiService'
import type { Collection } from '../types'
import type { ApiCollection } from '../types/api'

class CollectionsService {
  /**
   * Fetch root collections (for lazy loading)
   */
  async getRootCollections(): Promise<Collection[]> {
    try {
      const response = await restApiService.get<ApiCollection[]>('/collections')
      return response.data.map(this.mapApiCollectionToCollection)
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
      return response.data.map(this.mapApiCollectionToCollection)
    } catch (error: any) {
      console.error(`Failed to fetch children for collection ${collectionId}:`, error)
      throw new Error(`Failed to fetch collection children: ${error.message || 'Unknown error'}`)
    }
  }

  private mapApiCollectionToCollection(apiCollection: ApiCollection): Collection {
    return {
      id: apiCollection.id,
      name: apiCollection.name,
      hasResources: apiCollection.hasResources,
      hasChildren: apiCollection.hasChildren,
    }
  }
}

export const collectionsService = new CollectionsService()

