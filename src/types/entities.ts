/**
 * Core domain entities
 */

export interface Asset {
  id: string
  title: string
  description?: string
  fullUrl: string
  thumbnailUrl: string
  previewUrl?: string
  dimensions: { width: number; height: number }
  fileSize: number
  fileExtension: string
  mimeType: string
  metadata?: {
    keywords?: string
    photographer?: string
    [key: string]: any
  }
  createdAt: string
  modifiedAt: string
  // Legacy/computed properties for backward compatibility
  url?: string // Alias for fullUrl
  alt?: string // Alias for title
  mimetype?: string // Alias for mimeType
  filename?: string // Alias for title
  width?: number // Alias for dimensions.width
  height?: number // Alias for dimensions.height
  size?: number // Alias for fileSize
  updatedAt?: string // Alias for modifiedAt
  resourceType?: string // From search results
}

export interface Collection {
  id: string
  name: string
  parentId: string | null
  path: string
  isLeaf: boolean // true if collection has resources/assets (selectable)
  hasChildren: boolean // true if collection has child collections (expandable)
  children?: Collection[]
  // Note: path is derived from the tree structure, not from API
  // Note: isLeaf and hasChildren are independent - a collection can have both
}

export interface SerializedAttachment {
  id: string
  type: 'attachments'
  attributes: Record<string, any>
  relationships: Record<string, any>
  mimetype: string
  filename: string
  cdn_url: string
}

