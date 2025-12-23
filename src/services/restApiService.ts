/**
 * Shared REST API service for handling base API logic, authorization headers, and common request handling
 */

import type { ApiResponse, ApiError } from '../types'

// Re-export types for backward compatibility
export type { ApiResponse, ApiError }

class RestApiService {
  private baseUrl: string = import.meta.env.VITE_API_URL || '/api'
  private apiKey: string | null = null

  /**
   * Set the API key for authentication
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey
  }

  /**
   * Get the current API key
   */
  getApiKey(): string | null {
    return this.apiKey
  }

  /**
   * Reset the service state (useful for testing)
   */
  reset(): void {
    this.apiKey = null
  }

  /**
   * Set a custom base URL (useful for testing)
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url
  }

  /**
   * Get the current base URL
   */
  getBaseUrl(): string {
    return this.baseUrl
  }

  /**
   * Get authorization headers
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    return headers
  }

  /**
   * Make a GET request
   */
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        // Handle authentication errors
        if (response.status === 401 || response.status === 403) {
          const error: ApiError = {
            message: response.status === 401 
              ? 'Unauthorized: Invalid or missing API key'
              : 'Forbidden: Access denied',
            status: response.status,
            code: 'UNAUTHORIZED',
          }
          throw error
        }

        // Handle other HTTP errors
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.message || errorJson.error || errorMessage
        } catch {
          // If response is not JSON, use the text or default message
          if (errorText) {
            errorMessage = errorText
          }
        }

        throw {
          message: errorMessage,
          status: response.status,
        } as ApiError
      }

      const data = await response.json()
      return {
        data,
        status: response.status,
      }
    } catch (error) {
      // Re-throw ApiError as-is, otherwise wrap it
      if (error && typeof error === 'object' && 'status' in error && 'message' in error) {
        throw error
      }
      throw {
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 500,
      } as ApiError
    }
  }

  /**
   * Make a POST request
   */
  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      })

      if (!response.ok) {
        // Handle authentication errors
        if (response.status === 401 || response.status === 403) {
          const error: ApiError = {
            message: response.status === 401 
              ? 'Unauthorized: Invalid or missing API key'
              : 'Forbidden: Access denied',
            status: response.status,
            code: 'UNAUTHORIZED',
          }
          throw error
        }

        // Handle other HTTP errors
        const errorText = await response.text()
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.message || errorJson.error || errorMessage
        } catch {
          // If response is not JSON, use the text or default message
          if (errorText) {
            errorMessage = errorText
          }
        }

        throw {
          message: errorMessage,
          status: response.status,
        } as ApiError
      }

      const data = await response.json()
      return {
        data,
        status: response.status,
      }
    } catch (error) {
      // Re-throw ApiError as-is, otherwise wrap it
      if (error && typeof error === 'object' && 'status' in error && 'message' in error) {
        throw error
      }
      throw {
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 500,
      } as ApiError
    }
  }
}

// Export the class for testing and custom instances
export { RestApiService }

// Export singleton instance for convenience (shared API key state across the app)
// For testing, you can create a new instance: new RestApiService()
export const restApiService = new RestApiService()

