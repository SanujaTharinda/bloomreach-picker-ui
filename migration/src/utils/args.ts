/**
 * Command line argument parser
 */

export interface ParsedArgs {
  [key: string]: string | boolean | string[];
}

/**
 * Parse command line arguments into a key-value object
 * Supports:
 * - --key=value
 * - --key value
 * - --flag (boolean)
 * - -k value (short flags)
 */
export function parseArgs(args: string[]): ParsedArgs {
  const result: ParsedArgs = {};
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    // Handle --key=value format
    if (arg.startsWith('--') && arg.includes('=')) {
      const [key, value] = arg.substring(2).split('=', 2);
      result[key] = value;
      i++;
      continue;
    }

    // Handle --key format (boolean flag or next arg is value)
    if (arg.startsWith('--')) {
      const key = arg.substring(2);
      const nextArg = args[i + 1];

      // Check if next arg is a value (doesn't start with -)
      if (nextArg && !nextArg.startsWith('-')) {
        result[key] = nextArg;
        i += 2;
      } else {
        result[key] = true;
        i++;
      }
      continue;
    }

    // Handle -k value format (short flags)
    if (arg.startsWith('-') && arg.length === 2) {
      const key = arg.substring(1);
      const nextArg = args[i + 1];

      if (nextArg && !nextArg.startsWith('-')) {
        result[key] = nextArg;
        i += 2;
      } else {
        result[key] = true;
        i++;
      }
      continue;
    }

    // Handle positional arguments
    if (!('_' in result)) {
      result._ = [];
    }
    if (Array.isArray(result._)) {
      result._.push(arg);
    }
    i++;
  }

  return result;
}

/**
 * Get a specific argument value
 */
export function getArg(args: ParsedArgs, key: string, defaultValue?: string): string | undefined {
  return (args[key] as string) || defaultValue;
}

/**
 * Get a boolean flag
 */
export function getFlag(args: ParsedArgs, key: string): boolean {
  return Boolean(args[key]);
}

