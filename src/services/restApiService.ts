/**
 * Shared REST API service for handling base API logic, authorization headers, and common request handling
 */

import type { ApiResponse, ApiError } from '../types'

// Re-export types for backward compatibility
export type { ApiResponse, ApiError }

class RestApiService {
  private baseUrl: string = '/api' // Will be configured when real API is available
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
   * Get authorization headers
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
      headers['X-API-Key'] = this.apiKey
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
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return {
        data,
        status: response.status,
      }
    } catch (error) {
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
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return {
        data,
        status: response.status,
      }
    } catch (error) {
      throw {
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 500,
      } as ApiError
    }
  }
}

// Export singleton instance
export const restApiService = new RestApiService()

