/**
 * Authentication service for API key validation
 */

import { restApiService } from './restApiService'
import type { AuthResult } from '../types'

// Re-export types for backward compatibility
export type { AuthResult }

class AuthService {
  /**
   * Validate API key with the backend
   * For now, this is mocked - returns true if apiKey exists and is not empty
   */
  async validateApiKey(apiKey: string | null): Promise<AuthResult> {
    // Mock validation - simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    if (!apiKey || apiKey.trim() === '') {
      return {
        isValid: false,
        message: 'API key is required',
      }
    }

    // Mock: reject certain keys for testing
    if (apiKey === 'invalid-key' || apiKey === 'test-invalid') {
      return {
        isValid: false,
        message: 'Invalid API key',
      }
    }

    // Set the API key in the REST service for future requests
    restApiService.setApiKey(apiKey)

    // Mock successful validation
    return {
      isValid: true,
      message: 'Authentication successful',
    }
  }
}

// Export singleton instance
export const authService = new AuthService()

