import type { UiScope } from '@bloomreach/ui-extension-saas'
import { DocumentEditorMode, DialogSize } from '@bloomreach/ui-extension-saas'
import type { AssetRecord } from './entities'

export { DocumentEditorMode, DialogSize }

export interface BloomreachContextValue {
  ui: UiScope | null
  selectedAsset: AssetRecord | null
  setSelectedAsset: (asset: AssetRecord | null) => void
  mode: DocumentEditorMode
  isDialogMode: boolean
  isLoading: boolean
  error: string | null
  getApiKey: () => string | null
  getDialogSize: () => DialogSize
}
