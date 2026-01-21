import { Logger } from './logger.js';

/**
 * Configuration for fetch retry behavior
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 5) */
  maxRetries: number;
  /** Initial delay in milliseconds before first retry (default: 1000) */
  initialDelayMs: number;
  /** Maximum delay in milliseconds between retries (default: 30000) */
  maxDelayMs: number;
  /** HTTP status codes that should trigger a retry (default: [429, 500, 502, 503, 504]) */
  retryableStatuses: number[];
}

/**
 * Default retry configuration
 * - 5 retries with exponential backoff
 * - Starts at 1 second, caps at 30 seconds
 * - Retries on rate limits (429) and server errors (5xx)
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  retryableStatuses: [429, 500, 502, 503, 504],
};

/**
 * Calculate exponential backoff delay with optional jitter
 * @param attempt The current attempt number (0-based)
 * @param config Retry configuration
 * @returns Delay in milliseconds
 */
function calculateBackoff(attempt: number, config: RetryConfig): number {
  // Exponential backoff: initialDelay * 2^attempt
  const exponentialDelay = config.initialDelayMs * Math.pow(2, attempt);

  // Cap at maxDelay
  return Math.min(exponentialDelay, config.maxDelayMs);
}

/**
 * Sleep for a specified duration
 * @param ms Duration in milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with automatic retry on transient errors
 * 
 * Retries on:
 * - HTTP 429 (Too Many Requests / Rate Limit)
 * - HTTP 500 (Internal Server Error)
 * - HTTP 502 (Bad Gateway)
 * - HTTP 503 (Service Unavailable)
 * - HTTP 504 (Gateway Timeout)
 * - Network errors (ECONNREFUSED, ETIMEDOUT, etc.)
 * 
 * Does NOT retry on:
 * - HTTP 400 (Bad Request)
 * - HTTP 401 (Unauthorized)
 * - HTTP 403 (Forbidden)
 * - HTTP 404 (Not Found)
 * - HTTP 422 (Unprocessable Entity)
 * - Other client errors (4xx)
 * 
 * @param url The URL to fetch
 * @param options Fetch options (method, headers, body, etc.)
 * @param config Optional retry configuration
 * @returns The fetch Response
 * @throws Error if all retries are exhausted or a non-retryable error occurs
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Check if we should retry based on status code
      if (config.retryableStatuses.includes(response.status)) {
        if (attempt < config.maxRetries) {
          // Check for Retry-After header (some APIs tell you when to retry)
          const retryAfterHeader = response.headers.get('Retry-After');
          let delayMs: number;

          if (retryAfterHeader) {
            // Retry-After can be seconds or a date
            const retryAfterSeconds = parseInt(retryAfterHeader, 10);
            if (!isNaN(retryAfterSeconds)) {
              delayMs = retryAfterSeconds * 1000;
            } else {
              // It might be a date string
              const retryDate = new Date(retryAfterHeader);
              delayMs = Math.max(0, retryDate.getTime() - Date.now());
            }
            // Cap at maxDelay
            delayMs = Math.min(delayMs, config.maxDelayMs);
          } else {
            delayMs = calculateBackoff(attempt, config);
          }

          await Logger.warn(
            `Request to ${url.split('?')[0]} failed with HTTP ${response.status}, ` +
            `retrying in ${Math.round(delayMs / 1000)}s (attempt ${attempt + 1}/${config.maxRetries})`
          );
          await sleep(delayMs);
          continue;
        }
      }

      // For non-retryable status codes (400, 401, 404, etc.) or successful responses,
      // return immediately and let the caller handle it
      return response;

    } catch (error) {
      // Network errors (ECONNREFUSED, ETIMEDOUT, DNS failures, etc.) ARE retryable
      lastError = error as Error;

      if (attempt < config.maxRetries) {
        const delayMs = calculateBackoff(attempt, config);
        await Logger.warn(
          `Network error for ${url.split('?')[0]}: ${lastError.message}, ` +
          `retrying in ${Math.round(delayMs / 1000)}s (attempt ${attempt + 1}/${config.maxRetries})`
        );
        await sleep(delayMs);
      }
    }
  }

  // All retries exhausted
  throw lastError || new Error(`Request to ${url} failed after ${config.maxRetries} retries`);
}

