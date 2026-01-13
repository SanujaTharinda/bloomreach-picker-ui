/**
 * Type definitions for migration scripts
 */

export interface BrandfolderAsset {
  id: string;
  name: string;
  url: string;
  downloadUrl?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  collections?: string[];
}

export interface ResourceSpaceAsset {
  ref: number;
  title: string;
  file_path?: string;
  file_extension?: string;
  file_size?: number;
  metadata?: Record<string, unknown>;
}

export interface BloomreachContent {
  id: string;
  type: string;
  brandfolderAssetId?: string;
  brandfolderUrl?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface BrandfolderReference {
  attachmentId: string;
  assetId: string;
  documentId: string;
  documentPath: string;
  fieldPath: string;
  rawValue: string;
}

export interface MigrationPlan {
  assets: MigrationAsset[];
  collections: MigrationCollection[];
  totalAssets: number;
  totalSize: number;
  createdAt: Date;
}

export interface MigrationAsset {
  brandfolderId: string;
  brandfolderUrl: string;
  resourcespaceRef?: number;
  status: 'pending' | 'migrated' | 'failed' | 'skipped';
  error?: string;
}

export interface MigrationCollection {
  name: string;
  brandfolderIds: string[];
  resourcespaceId?: number;
  status: 'pending' | 'created' | 'failed';
  error?: string;
}
