/**
 * Authentication service for API key validation
 */

import type { UiScope } from '@bloomreach/ui-extension-saas'
import { restApiService } from './restApiService'
import type { AuthResult, ExtensionConfig } from '../types'

// Re-export types for backward compatibility
export type { AuthResult }

class AuthService {
  /**
   * Get API key from Bloomreach Custom Integration configuration
   * The configuration is stored in ui.extension.config as a JSON string
   */
  getApiKeyFromConfig(ui: UiScope | null): string | null {
    if (!ui) {
      return null
    }

    try {
      // Parse the configuration string (it's typically JSON)
      const config: ExtensionConfig = JSON.parse(ui.extension.config || '{}')
      return config.apiKey || null
    } catch (error) {
      console.error('Failed to parse extension configuration:', error)
      // If config is not JSON, try to use it directly as the API key
      // (some configurations might just be a plain string)
      return ui.extension.config || null
    }
  }

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

