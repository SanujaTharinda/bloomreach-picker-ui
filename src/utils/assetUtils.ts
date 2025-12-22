import type { Asset, Collection, SerializedAttachment } from '../types'

/**
 * Serialize asset to Bloomreach format
 */
export const serializeAsset = (asset: Asset): SerializedAttachment => {
  return {
    id: asset.id,
    type: 'attachments',
    attributes: {
      alt: asset.alt,
      url: asset.url,
    },
    relationships: {},
    mimetype: asset.mimetype,
    filename: asset.filename,
    cdn_url: asset.url,
  }
}

/**
 * Parse asset ID from Bloomreach field value
 */
export const parseAssetIdFromValue = (value: string): string | null => {
  if (!value) return null

  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed[0].id || null
    }
  } catch {
    // If parsing fails, return null
  }

  return null
}

/**
 * Parse asset information from Bloomreach field value
 */
export const parseAssetFromValue = (value: string): {
  id: string
  url: string
  alt: string
  filename: string
} | null => {
  if (!value) return null

  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed) && parsed.length > 0) {
      const attachment = parsed[0]
      return {
        id: attachment.id || '',
        url: attachment.attributes?.url || attachment.cdn_url || '',
        alt: attachment.attributes?.alt || attachment.filename || '',
        filename: attachment.filename || '',
      }
    }
  } catch {
    // If parsing fails, return null
  }

  return null
}

/**
 * Find a collection by ID in a hierarchical tree
 */
export const findCollectionById = (
  collections: Collection[],
  collectionId: string
): Collection | null => {
  for (const col of collections) {
    if (col.id === collectionId) {
      return col
    }
    if (col.children) {
      const found = findCollectionById(col.children, collectionId)
      if (found) return found
    }
  }
  return null
}

/**
 * Build breadcrumb path from root to a collection
 */
export const getCollectionBreadcrumb = (
  collections: Collection[],
  collectionId: string | null
): Collection[] => {
  if (!collectionId) return []
  
  const findCollectionWithParents = (
    cols: Collection[],
    targetId: string,
    path: Collection[] = []
  ): Collection[] | null => {
    for (const col of cols) {
      const currentPath = [...path, col]
      
      if (col.id === targetId) {
        return currentPath
      }
      
      if (col.children && col.children.length > 0) {
        const found = findCollectionWithParents(col.children, targetId, currentPath)
        if (found) return found
      }
    }
    return null
  }
  
  const breadcrumb = findCollectionWithParents(collections, collectionId)
  return breadcrumb || []
}

