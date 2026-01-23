import type { AssetDetail, AssetRecord } from '../types'

export const toAssetRecord = (asset: AssetDetail): AssetRecord => ({
  id: asset.id,
  title: asset.title,
  description: asset.description,
  cdn_url: asset.url,
  fileSize: asset.fileSize,
  fileExtension: asset.fileExtension,
  createdAt: asset.createdAt || '',
  modifiedAt: asset.modifiedAt || '',
})

export const parseAssetFromValue = (value: string): AssetRecord | null => {
  if (!value) return null

  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed[0] as AssetRecord
    }
  } catch {
    return null
  }

  return null
}
