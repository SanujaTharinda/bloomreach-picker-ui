/**
 * Collections service for fetching folder tree structure
 */

import { restApiService } from './restApiService'
import type { Collection, CollectionsTreeResponse } from '../types'

class CollectionsService {
  /**
   * Fetch all collections and build a hierarchical tree
   * For now, returns mock data
   */
  async getCollectionsTree(): Promise<Collection[]> {
    // Mock API call delay
    await new Promise((resolve) => setTimeout(resolve, 300))

    // Mock hierarchical collections data
    const mockCollections: Collection[] = [
      {
        id: 'root',
        name: 'Root',
        parentId: null,
        path: '/',
        hasChildren: true,
      },
      {
        id: 'col-1',
        name: 'Marketing Assets',
        parentId: 'root',
        path: '/marketing',
        hasChildren: true,
      },
      {
        id: 'col-2',
        name: 'Product Images',
        parentId: 'root',
        path: '/products',
        hasChildren: true,
      },
      {
        id: 'col-3',
        name: 'Banners',
        parentId: 'col-1',
        path: '/marketing/banners',
        hasChildren: false,
      },
      {
        id: 'col-4',
        name: 'Social Media',
        parentId: 'col-1',
        path: '/marketing/social',
        hasChildren: false,
      },
      {
        id: 'col-5',
        name: 'Hero Images',
        parentId: 'col-2',
        path: '/products/hero',
        hasChildren: false,
      },
      {
        id: 'col-6',
        name: 'Thumbnails',
        parentId: 'col-2',
        path: '/products/thumbnails',
        hasChildren: false,
      },
      {
        id: 'col-7',
        name: 'Brand Assets',
        parentId: 'root',
        path: '/brand',
        hasChildren: true,
      },
      {
        id: 'col-8',
        name: 'Logos',
        parentId: 'col-7',
        path: '/brand/logos',
        hasChildren: false,
      },
      {
        id: 'col-9',
        name: 'Icons',
        parentId: 'col-7',
        path: '/brand/icons',
        hasChildren: false,
      },
    ]

    // Build hierarchical tree structure
    return this.buildTree(mockCollections)
  }

  /**
   * Build a hierarchical tree from a flat list of collections
   */
  private buildTree(collections: Collection[]): Collection[] {
    const collectionMap = new Map<string, Collection>()
    const rootCollections: Collection[] = []

    // Create a map of all collections
    collections.forEach((collection) => {
      collectionMap.set(collection.id, { ...collection, children: [] })
    })

    // Build the tree structure
    collections.forEach((collection) => {
      const node = collectionMap.get(collection.id)!
      if (collection.parentId === null) {
        rootCollections.push(node)
      } else {
        const parent = collectionMap.get(collection.parentId)
        if (parent) {
          if (!parent.children) {
            parent.children = []
          }
          parent.children.push(node)
        }
      }
    })

    return rootCollections
  }

  /**
   * Fetch a single collection by ID
   */
  async getCollectionById(collectionId: string): Promise<Collection | null> {
    // Mock API call
    await new Promise((resolve) => setTimeout(resolve, 200))

    // In real implementation, this would call the API
    // For now, return null (collections are loaded via getCollectionsTree)
    return null
  }
}

// Export singleton instance
export const collectionsService = new CollectionsService()

