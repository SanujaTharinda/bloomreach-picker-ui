/**
 * Authentication-related types
 */

export interface AuthResult {
  isValid: boolean
  message?: string
}

export interface ExtensionConfig {
  apiKey?: string
  dialogSize?: 'small' | 'medium' | 'large'
  [key: string]: any
}

export interface AuthContextValue {
  isAuthenticated: boolean
  authLoading: boolean
  authError: string
  apiKeySet: boolean
  handleAuthError?: (error: any) => void
  markAuthVerified?: () => void
}

