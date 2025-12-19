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

