import type { DialogSize } from '@bloomreach/ui-extension-saas'

export interface AuthResult {
  isValid: boolean
  message?: string
}

export interface ExtensionConfig {
  apiKey?: string
  dialogSize?: DialogSize
  [key: string]: any
}

export interface AuthContextValue {
  isAuthenticated: boolean
  authLoading: boolean
  authError: string
  apiKeySet: boolean
  handleAuthError?: (error: any) => void
}
