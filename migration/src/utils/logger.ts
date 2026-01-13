import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Simple logger utility for migration scripts
 */
export class Logger {
  private static logFilePath: string | null = null;

  /**
   * Initialize file logging
   */
  static async initializeFileLogging(logFilePath: string): Promise<void> {
    // Ensure directory exists
    await fs.mkdir(path.dirname(logFilePath), { recursive: true });
    this.logFilePath = logFilePath;
    // Create/clear the log file
    await fs.writeFile(logFilePath, '', 'utf-8');
  }

  /**
   * Close file logging
   */
  static async closeFileLogging(): Promise<void> {
    this.logFilePath = null;
  }

  /**
   * Write to both console and file if file logging is enabled
   */
  private static async write(level: string, message: string, ...args: unknown[]): Promise<void> {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message} ${args.length > 0 ? JSON.stringify(args) : ''}\n`;
    
    // Always write to console
    if (level === 'ERROR') {
      console.error(`[${level}] ${message}`, ...args);
    } else if (level === 'WARN') {
      console.warn(`[${level}] ${message}`, ...args);
    } else {
      console.log(`[${level}] ${message}`, ...args);
    }

    // Write to file if enabled
    if (this.logFilePath) {
      await fs.appendFile(this.logFilePath, logMessage, 'utf-8');
    }
  }

  static async info(message: string, ...args: unknown[]): Promise<void> {
    await this.write('INFO', message, ...args);
  }

  static async error(message: string, ...args: unknown[]): Promise<void> {
    await this.write('ERROR', message, ...args);
  }

  static async warn(message: string, ...args: unknown[]): Promise<void> {
    await this.write('WARN', message, ...args);
  }

  static async success(message: string, ...args: unknown[]): Promise<void> {
    await this.write('SUCCESS', message, ...args);
  }

  static async phase(phaseName: string): Promise<void> {
    const separator = '='.repeat(50);
    const phaseMessage = `\n${separator}\nPhase: ${phaseName}\n${separator}\n`;
    
    console.log(phaseMessage);
    
    if (this.logFilePath) {
      const timestamp = new Date().toISOString();
      await fs.appendFile(this.logFilePath, `[${timestamp}] ${phaseMessage}`, 'utf-8');
    }
  }
}

