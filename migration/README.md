# Brandfolder to Resource Space Migration

This project contains one-time migration scripts to transfer content from Brandfolder to Resource Space, specifically for content that's used in Bloomreach. These scripts are intended for a single migration run and are not designed for ongoing synchronization.

## Project Structure

```
migration/
├── src/
│   ├── scripts/        # Migration scripts
│   ├── services/       # API services (Brandfolder, Resource Space, Bloomreach)
│   ├── config/         # Configuration loaders
│   ├── utils/          # Utility functions (args, env, logger)
│   ├── types/          # TypeScript type definitions
│   └── index.ts        # Main entry point
├── metadata-config/    # Metadata configuration files (required for Phase 2)
│   ├── resourcespace_field_config.json           # ResourceSpace field IDs
│   └── brandfolder_b_dam_metadata_mapping.json   # Tag to value mapping
├── migration-output/   # Output files from migration phases
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

**Required Configuration Files:**

Before running Phase 2, you must configure two JSON files in the `metadata-config/` folder:

1. **`metadata-config/resourcespace_field_config.json`** - ResourceSpace field IDs and allowed values

   This file defines the field IDs for your ResourceSpace instance. Field IDs vary between installations.

   ```json
   {
     "standardFields": {
       "title": 8,
       "description": 3
     },
     "customFields": {
       "bikeLine": {
         "fieldId": 75,
         "displayName": "Bike Line",
         "values": ["A Line", "C Line", "P Line", ...]
       },
       "colour": {
         "fieldId": 79,
         "displayName": "Colour",
         "values": ["Black", "White", "Red", ...]
       }
     }
   }
   ```

2. **`metadata-config/brandfolder_b_dam_metadata_mapping.json`** - Brandfolder tag to ResourceSpace value mapping

   This file maps Brandfolder tags to ResourceSpace metadata field values. Tags with empty values are ignored.

   ```json
   {
     "Summer": "Summer",
     "12-speed CRM": "12-Speed",
     "Cherry Blossom": "",
     ...
   }
   ```

   You can generate this file from an Excel/CSV using the helper script:
   ```bash
   npx tsx src/scripts/extract-tag-mapping.ts your-mapping.csv
   ```

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

## Docker Usage

The migration scripts can be run inside a Docker container for consistent execution across environments.

### Prerequisites

- Docker and Docker Compose installed
- A `.env` file with your API credentials (see Setup section above)

### Building the Docker Image

```bash
cd migration
docker compose build
```

Or build directly with Docker:

```bash
docker build -t b-dam-migration .
```

### Running Migration Scripts

Use `docker compose run` to execute migration scripts:

**Build Brandfolder Inventory (Phase 1):**
```bash
docker compose run --rm migration build-brandfolder-inventory --folder=brxsaas
```

**Migrate to B-DAM (Phase 2):**
```bash
docker compose run --rm migration brandfolder-b-dam-migration --folder=brxsaas
```

**Update Bloomreach Fields (Phase 3):**
```bash
docker compose run --rm migration update-bloomreach-fields --folder=brxsaas
```

**Show Help:**
```bash
docker compose run --rm migration --help
```

### Using Docker Directly

You can also run with Docker directly:

```bash
# Build the image
docker build -t b-dam-migration .

# Run a script with environment file and volume mounts
docker run --rm \
  --env-file .env \
  -v "$(pwd)/migration-output:/app/migration-output" \
  -v "$(pwd)/metadata-config:/app/metadata-config" \
  b-dam-migration build-brandfolder-inventory --folder=brxsaas
```

### Output Files

Migration output files are persisted to the `./migration-output` directory on your host machine through Docker volume mounts:

- **Phase 1:** `./migration-output/phase-1/*.json` - Brandfolder inventory
- **Phase 2:** `./migration-output/phase-2/*.json` - B-DAM migration results
- **Phase 3:** `./migration-output/phase-3/*.json, *.ndjson` - Bloomreach update results

### Environment Variables in Docker

Copy the template file and fill in your values:

```bash
cp env.template .env
```

Then edit `.env` with your API credentials. The template includes all required and optional variables:

| Variable | Required For | Description |
|----------|-------------|-------------|
| `BLOOMREACH_API_URL` | Phase 1, 3 | Bloomreach API base URL |
| `BLOOMREACH_MANAGEMENT_API_KEY` | Phase 3 | Bloomreach Management API key |
| `BLOOMREACH_PROJECT_ID` | Phase 3 | Bloomreach project ID for content import |
| `BRANDFOLDER_API_KEY` | Phase 2 | Brandfolder API key |
| `BRANDFOLDER_BASE_URL` | Phase 2 | Brandfolder API URL (default: `https://brandfolder.com/api/v4`) |
| `RESOURCESPACE_URL` | Phase 2 | Resource Space API base URL |
| `RESOURCESPACE_API_KEY` | Phase 2 | Resource Space API key |
| `RESOURCESPACE_USER` | Phase 2 | Resource Space user (default: `admin`) |
| `RESOURCESPACE_ROOT_COLLECTION_NAME` | Phase 2 | Root collection name (default: `Website Archive`) |

## Development

This project uses:
- **TypeScript** for type safety
- **tsx** for running TypeScript directly in development
- **ESLint** for code quality
- **Docker** for containerized execution

