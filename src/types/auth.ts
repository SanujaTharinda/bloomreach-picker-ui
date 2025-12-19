/**
 * Authentication-related types
 */

export interface AuthResult {
  isValid: boolean
  message?: string
}

export interface ExtensionConfig {
  apiKey?: string
  [key: string]: any
}

export interface AuthContextValue {
  isAuthenticated: boolean
  authLoading: boolean
  authError: string
}

