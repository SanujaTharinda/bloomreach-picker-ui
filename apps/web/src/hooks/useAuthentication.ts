import { useEffect, useState, useCallback } from 'react'
import { authService } from '../services/authService'
import { useBloomreachContext } from '../contexts/BloomreachContext'
import type { UseAuthenticationReturn } from '../types'

export const useAuthentication = (): UseAuthenticationReturn => {
  const { getApiKey, isLoading: extensionLoading } = useBloomreachContext()
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState<string>('')
  const [apiKeySet, setApiKeySet] = useState(false)

  const handleAuthError = useCallback((error: any) => {
    if (error?.status === 401 || error?.status === 403 || error?.code === 'UNAUTHORIZED') {
      setIsAuthenticated(false)
      setAuthError(
        error.message ||
        'Unauthorized: Invalid or missing API key. Please configure the API key in the Bloomreach Custom Integration settings.'
      )
      setAuthLoading(false)
    }
  }, [])

  useEffect(() => {
    if (extensionLoading) return

    const apiKey = getApiKey()

    if (!apiKey) {
      setIsAuthenticated(false)
      setAuthLoading(false)
      setAuthError(
        'API key is required. Please configure the API key in the Bloomreach Custom Integration settings.'
      )
      return
    }

    authService.setApiKey(apiKey)
    setApiKeySet(true)
    setAuthLoading(false)
  }, [extensionLoading, getApiKey])

  return {
    isAuthenticated,
    authLoading,
    authError,
    apiKeySet,
    handleAuthError,
  }
}
