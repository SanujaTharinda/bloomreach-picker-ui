import { useEffect, useState } from 'react'
import { authService } from '../services/authService'
import { useBloomreachContext } from '../contexts/BloomreachContext'
import type { UseAuthenticationReturn } from '../types'

export const useAuthentication = (): UseAuthenticationReturn => {
  const { getApiKey, isLoading: extensionLoading } = useBloomreachContext()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState<string>('')

  useEffect(() => {
    const authenticate = async () => {
      if (extensionLoading) return;

      try {
        setAuthLoading(true);
        setAuthError('');

        const apiKey = getApiKey();

        if (!apiKey) {
          setIsAuthenticated(false)
          setAuthError(
            'API key is required. Please configure the API key in the Bloomreach Custom Integration settings.'
          );
          return;
        }

        const authResult = await authService.validateApiKey(apiKey)

        if (authResult.isValid) {
          setIsAuthenticated(true)
          setAuthError('')
        } else {
          setIsAuthenticated(false)
          setAuthError(authResult.message || 'Invalid API key')
        }
      } catch (err: any) {
        console.error('Authentication error:', err)
        setIsAuthenticated(false)
        setAuthError(err.message || 'Authentication failed')
      } finally {
        setAuthLoading(false)
      }
    }

    authenticate()
  }, [extensionLoading, getApiKey])

  return {
    isAuthenticated,
    authLoading,
    authError,
  }
}

