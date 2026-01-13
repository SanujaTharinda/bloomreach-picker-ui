/**
 * Environment variable utilities
 */

/**
 * Get an environment variable or throw an error if not set
 */
export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Required environment variable ${key} is not set`);
  return value;
}

/**
 * Get an environment variable with a default value
 */
export function getEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Get an optional environment variable
 */
export function getOptionalEnv(key: string): string | undefined {
  return process.env[key];
}

/**
 * Validate that all required environment variables are set
 */
export function validateEnv(requiredKeys: string[]): void {
  const missing: string[] = [];

  for (const key of requiredKeys) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

