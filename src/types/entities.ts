/**
 * Core domain entities
 */

export interface Asset {
  id: string
  url: string
  alt: string
  mimetype: string
  filename: string
  width?: number
  height?: number
  size?: number
  createdAt?: string
  updatedAt?: string
}

export interface Collection {
  id: string
  name: string
  parentId: string | null
  path: string
  hasChildren: boolean
  children?: Collection[]
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

