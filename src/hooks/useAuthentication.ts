import { useEffect, useState, useCallback } from 'react'
import { authService } from '../services/authService'
import { useBloomreachContext } from '../contexts/BloomreachContext'
import type { UseAuthenticationReturn } from '../types'

export const useAuthentication = (): UseAuthenticationReturn => {
  const { getApiKey, isLoading: extensionLoading } = useBloomreachContext()
  const [isAuthenticated, setIsAuthenticated] = useState(true) // Start optimistic
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState<string>('')
  const [hasVerifiedAuth, setHasVerifiedAuth] = useState(false) // Track if we've verified auth via API call

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
  const markAuthVerified = useCallback(() => {
    if (!hasVerifiedAuth) {
      setHasVerifiedAuth(true)
      setAuthLoading(false)
    }
  }, [hasVerifiedAuth])

  // Set API key when available
  useEffect(() => {
    if (extensionLoading) return

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
    // Keep authLoading as true until we verify via API call
    // Don't set authLoading to false here - wait for first API call to complete
  }, [extensionLoading, getApiKey])


  return {
    isAuthenticated,
    authLoading,
    authError,
    handleAuthError, // Expose for use in hooks
    markAuthVerified, // Expose for use in hooks to mark auth as verified after successful API call
  }
}

