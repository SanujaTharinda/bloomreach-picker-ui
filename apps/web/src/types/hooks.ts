import type { UiScope } from '@bloomreach/ui-extension-saas'
import type { DocumentEditorMode, DialogSize } from './bloomreach'
import type { AssetRecord } from './entities'

export interface UseAuthenticationReturn {
  isAuthenticated: boolean
  authLoading: boolean
  authError: string
  apiKeySet: boolean
  handleAuthError?: (error: { status?: number; code?: string; message?: string }) => void
}

export interface UseBloomreachExtensionReturn {
  ui: UiScope | null
  selectedAsset: AssetRecord | null
  setSelectedAsset: (asset: AssetRecord | null) => void
  mode: DocumentEditorMode
  isDialogMode: boolean
  isLoading: boolean
  error: string
  getApiKey: () => string | null
  getDialogSize: () => DialogSize
}
