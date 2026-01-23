import { useState, useCallback, useMemo, useLayoutEffect } from 'react'
import { authService } from '../services/authService'
import { useBloomreachContext } from '../contexts/BloomreachContext'
import type { UseAuthenticationReturn } from '../types'

export const useAuthentication = (): UseAuthenticationReturn => {
  const { getApiKey, isLoading: extensionLoading } = useBloomreachContext()
  const [authErrorFromApi, setAuthErrorFromApi] = useState<string>('')

  const apiKey = extensionLoading ? null : getApiKey()
  const apiKeySet = !extensionLoading && !!apiKey

  useLayoutEffect(() => {
    if (apiKeySet && apiKey) {
      authService.setApiKey(apiKey)
    }
  }, [apiKeySet, apiKey])

  const { isAuthenticated, authError, authLoading } = useMemo(() => {
    if (extensionLoading) {
      return { isAuthenticated: true, authError: '', authLoading: true }
    }
    if (authErrorFromApi) {
      return { isAuthenticated: false, authError: authErrorFromApi, authLoading: false }
    }
    if (!apiKey) {
      return {
        isAuthenticated: false,
        authError: 'API key is required. Please configure the API key in the Bloomreach Custom Integration settings.',
        authLoading: false,
      }
    }
    return { isAuthenticated: true, authError: '', authLoading: false }
  }, [extensionLoading, apiKey, authErrorFromApi])

  const handleAuthError = useCallback((error: { status?: number; code?: string; message?: string }) => {
    if (error?.status === 401 || error?.status === 403 || error?.code === 'UNAUTHORIZED') {
      setAuthErrorFromApi(
        error.message ||
        'Unauthorized: Invalid or missing API key. Please configure the API key in the Bloomreach Custom Integration settings.'
      )
    }
  }, [])

  return {
    isAuthenticated,
    authLoading,
    authError,
    apiKeySet,
    handleAuthError,
  }
}
