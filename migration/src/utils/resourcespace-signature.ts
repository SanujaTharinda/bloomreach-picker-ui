import * as crypto from 'crypto';

/**
 * ResourceSpace API signature utilities
 * ResourceSpace requires SHA256(privateKey + queryString) for authentication
 */

/**
 * Generates the SHA256 signature required by ResourceSpace API
 */
export function generateSignature(privateKey: string, queryString: string): string {
  const input = privateKey + queryString;
  const hash = crypto.createHash('sha256').update(input, 'utf8').digest('hex');
  return hash;
}

/**
 * Builds a query string for ResourceSpace API (URL-encoded)
 * Matches the C# implementation: user first, then function, then parameters sorted alphabetically
 * ResourceSpace requires parameters to be sorted alphabetically for signature validation
 */
export function buildQueryString(
  user: string,
  functionName: string,
  parameters?: Record<string, string>
): string {
  const parts: string[] = [
    `user=${encodeURIComponent(user)}`,
    `function=${encodeURIComponent(functionName)}`,
  ];

  if (parameters) {
    // Sort parameters alphabetically by key for ResourceSpace signature validation
    // This is required even though C# Dictionary iteration order might differ
    const sortedKeys = Object.keys(parameters).sort();
    for (const key of sortedKeys) {
      const value = parameters[key];
      // Include empty strings (e.g., size='' for original file) but skip null/undefined
      if (value !== null && value !== undefined) {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
      }
    }
  }

  return parts.join('&');
}

/**
 * Builds a complete signed URL for ResourceSpace API
 */
export function buildSignedUrl(
  baseUrl: string,
  user: string,
  privateKey: string,
  functionName: string,
  parameters?: Record<string, string>
): string {
  const queryString = buildQueryString(user, functionName, parameters);
  const signature = generateSignature(privateKey, queryString);
  const trimmedBaseUrl = baseUrl.replace(/\/$/, '');
  return `${trimmedBaseUrl}/api/?${queryString}&sign=${signature}`;
}

/**
 * Builds query string without signature (for debugging)
 */
export function buildQueryStringForDebug(
  user: string,
  functionName: string,
  parameters?: Record<string, string>
): string {
  return buildQueryString(user, functionName, parameters);
}

