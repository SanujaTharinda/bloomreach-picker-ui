# Brandfolder to Resource Space Migration

This project contains migration scripts to transfer content from Brandfolder to Resource Space, specifically for content that's used in Bloomreach.

## Project Structure

```
migration/
├── src/
│   ├── scripts/        # Migration scripts
│   ├── services/       # API services (Brandfolder, Resource Space, Bloomreach)
│   ├── utils/          # Utility functions (args, env, logger)
│   ├── types/          # TypeScript type definitions
│   └── index.ts        # Main entry point
├── dist/               # Compiled JavaScript output
└── package.json
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with your API credentials:
```env
BLOOMREACH_API_URL=https://your-bloomreach-instance.com
BLOOMREACH_MANAGEMENT_API_KEY=your_management_api_key
BLOOMREACH_PROJECT_ID=your_project_id
BRANDFOLDER_API_KEY=your_brandfolder_api_key
RESOURCESPACE_URL=your_resourcespace_url
RESOURCESPACE_API_KEY=your_resourcespace_api_key
RESOURCESPACE_USER=admin
RESOURCESPACE_ROOT_COLLECTION_NAME=Website Archive
```

## Usage

### Running Scripts

Run a script in development mode (with tsx):
```bash
npm run dev -- [script-name] [options]
```

Or specify the script explicitly:
```bash
npm run dev -- --script=[script-name] [options]
```

Build the project:
```bash
npm run build
```

Run the compiled version:
```bash
npm start [script-name] [options]
```

### Available Scripts

#### build-brandfolder-inventory
Builds a comprehensive inventory of all Brandfolder references found in Bloomreach CMS content.

```bash
npm run dev -- build-brandfolder-inventory --folder=<bloomreach-folder>
```

**Arguments:**
- `--folder` or `-f` (required) - The Bloomreach folder to process

**Output:**
- Generates a JSON inventory file in `./migration-output/phase-1/`
- File is prefixed with the Bloomreach folder name (e.g., `my-folder-brandfolder-inventory.json`)
- Contains all Brandfolder references found in Bloomreach content

**Environment Variables:**
- `BLOOMREACH_API_URL` (required) - Bloomreach Delivery API base URL
- `MIGRATION_OUTPUT_DIR` (optional) - Base output directory (default: `./migration-output`)
- `INVENTORY_OUTPUT_FILE` (optional) - Custom output filename (default: `<folder>-brandfolder-inventory.json`)

**Example:**
```bash
npm run dev -- build-brandfolder-inventory --folder=my-bloomreach-folder
# Output: ./migration-output/phase-1/my-bloomreach-folder-brandfolder-inventory.json
```

#### brandfolder-b-dam-migration
Migrates Brandfolder attachments to B-DAM (Resource Space) based on the phase-1 inventory.

```bash
npm run dev -- brandfolder-b-dam-migration --folder=<bloomreach-folder>
```

**Arguments:**
- `--folder` or `-f` (required) - The Bloomreach folder to process (must match phase-1 folder)

**Output:**
- Generates a JSON migration result file in `./migration-output/phase-2/`
- File is prefixed with the Bloomreach folder name (e.g., `my-folder-b-dam-migration.json`)
- Contains all references from phase-1 with additional `bdamValue` field

**Environment Variables:**
- `BRANDFOLDER_API_KEY` (required) - Brandfolder API key
- `BRANDFOLDER_BASE_URL` (optional) - Brandfolder API base URL (default: `https://brandfolder.com/api/v4`)
- `RESOURCESPACE_URL` (required) - Resource Space API base URL
- `RESOURCESPACE_API_KEY` (required) - Resource Space API key
- `RESOURCESPACE_USER` (optional) - Resource Space API user (default: `admin`)
- `RESOURCESPACE_ROOT_COLLECTION_NAME` (optional) - Root collection name for organizing migrated assets (default: `Website Archive`)
- `MIGRATION_OUTPUT_DIR` (optional) - Base output directory (default: `./migration-output`)
- `MIGRATION_OUTPUT_FILE` (optional) - Custom output filename (default: `<folder>-b-dam-migration.json`)

**Example:**
```bash
npm run dev -- brandfolder-b-dam-migration --folder=my-bloomreach-folder
# Reads: ./migration-output/phase-1/my-bloomreach-folder-brandfolder-inventory.json
# Output: ./migration-output/phase-2/my-bloomreach-folder-b-dam-migration.json
```

#### update-bloomreach-fields
Updates Bloomreach document fields with migrated Resource Space (B-DAM) values from phase-2 results using the content import endpoint.

This script:
1. Reads phase-2 migration results
2. Retrieves documents from Bloomreach core project
3. Updates Brandfolder fields with B-DAM values
4. Creates an NDJSON file with all updated documents
5. Imports the NDJSON file via the content import endpoint

```bash
npm run dev -- update-bloomreach-fields --folder=<bloomreach-folder>
```

**Arguments:**
- `--folder` or `-f` (required) - The Bloomreach folder to process (must match phase-2 folder)

**Output:**
- Generates an NDJSON file in `./migration-output/phase-3/` (e.g., `my-folder-content-import.ndjson`)
- Generates a JSON update result file in `./migration-output/phase-3/` (e.g., `my-folder-bloomreach-updates.json`)
- Contains update results and import response

**Environment Variables:**
- `BLOOMREACH_API_URL` (required) - Bloomreach API base URL
- `BLOOMREACH_MANAGEMENT_API_KEY` (required) - Bloomreach Management API key (for `X-AUTH-TOKEN` header)
- `BLOOMREACH_PROJECT_ID` (required) - Bloomreach project ID for content import
- `MIGRATION_OUTPUT_DIR` (optional) - Base output directory (default: `./migration-output`)

**Example:**
```bash
npm run dev -- update-bloomreach-fields --folder=my-bloomreach-folder
# Reads: ./migration-output/phase-2/my-bloomreach-folder-b-dam-migration.json
# Output: ./migration-output/phase-3/my-bloomreach-folder-content-import.ndjson
# Output: ./migration-output/phase-3/my-bloomreach-folder-bloomreach-updates.json
```

### Command Line Arguments

The scripts support command line arguments:
- `--key=value` or `--key value` - Set a key-value pair
- `--flag` - Set a boolean flag
- `-k value` - Short flag format

Example:
```bash
npm run dev -- build-brandfolder-inventory --output=./custom-output
```

## Development

This project uses:
- **TypeScript** for type safety
- **tsx** for running TypeScript directly in development
- **ESLint** for code quality

