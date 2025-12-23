/**
 * Authentication service for API key management
 * Authentication is determined by API responses (401/403 errors)
 */

import { restApiService } from './restApiService'

class AuthService {
  /**
   * Set the API key in the REST service
   * Authentication will be validated when making actual API calls
   */
  setApiKey(apiKey: string | null): void {
    if (apiKey) {
      restApiService.setApiKey(apiKey)
    }
  }

  /**
   * Check if API key is configured
   */
  hasApiKey(): boolean {
    return restApiService.getApiKey() !== null
  }
}

// Export singleton instance
export const authService = new AuthService()


