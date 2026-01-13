#!/usr/bin/env node

import 'dotenv/config';
import { parseArgs, getArg } from './utils/args.js';
import { Logger } from './utils/logger.js';
import { buildBrandfolderInventory } from './scripts/build-brandfolder-inventory.js';
import { brandfolderBdamMigration } from './scripts/brandfolder-b-dam-migration.js';
import { updateBloomreachFields } from './scripts/update-bloomreach-fields.js';

// Available scripts registry
const scripts = {
  'build-brandfolder-inventory': buildBrandfolderInventory,
  'brandfolder-b-dam-migration': brandfolderBdamMigration,
  'update-bloomreach-fields': updateBloomreachFields,
} as const;

type ScriptName = keyof typeof scripts;

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Get script name from --script argument or first positional argument
  const scriptName = (getArg(args, 'script') || 
    (Array.isArray(args._) && args._[0] ? args._[0] : null)) as ScriptName | null;

  if (!scriptName || !scripts[scriptName]) {
    await Logger.error('No script specified or invalid script name');
    console.log('\nUsage: npm run dev -- [script-name] [options]');
    console.log('   or: npm run dev -- --script=[script-name] [options]');
    console.log('\nAvailable scripts:');
    Object.keys(scripts).forEach((name) => {
      console.log(`  - ${name}`);
    });
    process.exit(1);
  }

  try {
    await Logger.info(`Running script: ${scriptName}`);
    await Logger.info('Command line arguments:', args);
    
    await scripts[scriptName](args);
    
    await Logger.success(`Script ${scriptName} completed successfully`);
  } catch (error) {
    await Logger.error(`Error in script ${scriptName}:`, error);
    await Logger.closeFileLogging();
    process.exit(1);
  }
}

main().catch(async (error) => {
  await Logger.error('Fatal error:', error);
  process.exit(1);
});

