import { useEffect, useState, useCallback } from 'react'
import { authService } from '../services/authService'
import { useBloomreachContext } from '../contexts/BloomreachContext'
import type { UseAuthenticationReturn } from '../types'

export const useAuthentication = (): UseAuthenticationReturn => {
  const { getApiKey, isLoading: extensionLoading } = useBloomreachContext()
  const [isAuthenticated, setIsAuthenticated] = useState(true) // Start optimistic
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState<string>('')
  const [, setHasVerifiedAuth] = useState(false) // Track if we've verified auth via API call (value read via functional updates)
  const [apiKeySet, setApiKeySet] = useState(false) // Track if API key has been set in authService

  // Function to handle authentication errors from API calls
  const handleAuthError = useCallback((error: any) => {
    if (error?.status === 401 || error?.status === 403 || error?.code === 'UNAUTHORIZED') {
      setIsAuthenticated(false)
      setAuthError(
        error.message || 
        'Unauthorized: Invalid or missing API key. Please configure the API key in the Bloomreach Custom Integration settings.'
      )
      setHasVerifiedAuth(true) // Mark as verified (even though it failed)
      setAuthLoading(false) // Stop loading once we know auth status
    }
  }, [])

  // Function to mark authentication as verified (called after successful API call)
  // Using functional update to avoid dependency on hasVerifiedAuth, ensuring stable reference
  const markAuthVerified = useCallback(() => {
    setHasVerifiedAuth((prev) => {
      if (!prev) {
        setAuthLoading(false)
      }
      return true
    })
  }, [])

  // Set API key when available
  useEffect(() => {
    if (extensionLoading) return

    console.log('extensionLoading', extensionLoading)
    console.log('getApiKey', getApiKey())
    const apiKey = getApiKey()

    if (!apiKey) {
      setIsAuthenticated(false)
      setAuthLoading(false)
      setAuthError(
        'API key is required. Please configure the API key in the Bloomreach Custom Integration settings.'
      )
      setHasVerifiedAuth(true) // No API key means we've "verified" (it's invalid)
      return
    }

    // Set the API key in the service
    authService.setApiKey(apiKey)
    setApiKeySet(true) // Mark API key as set so dependent hooks can proceed
    setAuthLoading(false) // Allow rendering - first API call will verify if key is valid
  }, [extensionLoading, getApiKey])


  return {
    isAuthenticated,
    authLoading,
    authError,
    apiKeySet,
    handleAuthError, // Expose for use in hooks
    markAuthVerified, // Expose for use in hooks to mark auth as verified after successful API call
  }
}

