# ResourceSpace Docker Configuration

Custom Docker setup for ResourceSpace DAM.

Based on the [official ResourceSpace Docker repository](https://github.com/resourcespace/docker).

> **Note**: ResourceSpace doesn't publish a pre-built Docker image. This Dockerfile builds from source by cloning the official ResourceSpace repository during the build process.

## Quick Start

### Local Development (with MariaDB)

```bash
cd services/resourcespace

# Copy local environment template
cp .env.local.example .env

# Generate security keys and update .env
openssl rand -hex 32  # Copy output to RS_SCRAMBLE_KEY
openssl rand -hex 32  # Copy output to RS_API_SCRAMBLE_KEY

# Start with local profile (includes MariaDB container)
docker compose --profile local up --build -d

# Access ResourceSpace at http://localhost:8080
```

### Staging/Production (Azure MySQL)

```bash
cd services/resourcespace

# Copy environment template
cp .env.example .env

# Edit .env with your Azure MySQL credentials and generate security keys
nano .env

# Start without profile (no MariaDB, uses Azure MySQL)
docker compose up --build -d
```

## ResourceSpace Initial Setup

When you first access ResourceSpace, the setup wizard will appear:

1. **Database Host**: 
   - Local: `mariadb` (Docker service name, NOT localhost)
   - Azure: `your-server.mysql.database.azure.com`
2. **Database Name**: `resourcespace`
3. **Database User**: Your configured user
4. **Database Password**: Your configured password
5. **MySQL Binary Path**: Leave empty

> ⚠️ **Important**: For Docker, always use `mariadb` as the database host, not `localhost`. Containers communicate via service names.

## File Structure

```
services/resourcespace/
├── Dockerfile              # Builds RS from source (clones official repo)
├── docker-compose.yml      # Multi-environment setup with profiles
├── entrypoint.sh           # Container startup script
├── cronjob                 # Scheduled tasks configuration
├── .env                    # Your secrets (gitignored)
├── .env.example            # Template for staging/prod
├── .env.local.example      # Template for local development
├── config/
│   └── config.php          # RS configuration (reads from env vars)
├── plugins/                # Custom plugins (if any)
│   └── .gitkeep
└── README.md
```

## Environment Variables

### Database

| Variable | Description | Local Default | Staging/Prod |
|----------|-------------|---------------|--------------|
| `DB_HOST` | Database hostname | `mariadb` | Azure MySQL hostname |
| `DB_NAME` | Database name | `resourcespace` | `resourcespace` |
| `DB_USER` | Database user | `resourcespace_rw` | `user@server` |
| `DB_PASSWORD` | Database password | `localdevpassword` | From Azure |
| `MYSQL_ROOT_PASSWORD` | MariaDB root (local only) | `localrootpassword` | N/A |

### ResourceSpace Settings

| Variable | Description | Local Default | Staging/Prod |
|----------|-------------|---------------|--------------|
| `RS_PORT` | Exposed port | `8080` | `80` |
| `RS_BASE_URL` | Full URL to RS | `http://localhost:8080` | `https://your-domain.com` |
| `RS_APP_NAME` | Application name | `Brompton DAM (Local)` | `Brompton Digital Asset Management` |

### Security Keys

| Variable | Description | How to Generate |
|----------|-------------|-----------------|
| `RS_SCRAMBLE_KEY` | Internal security key | `openssl rand -hex 32` |
| `RS_API_SCRAMBLE_KEY` | API security key | `openssl rand -hex 32` |

> ⚠️ **Important**: Generate unique keys for each environment. Never reuse keys between local/staging/production.

### Email

| Variable | Description | Example |
|----------|-------------|---------|
| `RS_EMAIL_FROM` | Sender email address | `noreply@yourdomain.com` |
| `RS_EMAIL_NOTIFY` | Admin notification email | `admin@yourdomain.com` |

## Commands

```bash
# Start (local with MariaDB)
docker compose --profile local up --build -d

# Start (staging/prod with Azure MySQL)
docker compose up --build -d

# View logs
docker compose logs -f resourcespace

# Stop
docker compose down

# Stop and remove volumes (⚠️ deletes data)
docker compose down -v

# Rebuild after changes
docker compose --profile local up --build -d
```

## Volumes

| Volume | Purpose |
|--------|---------|
| `resourcespace_filestore` | Uploaded assets and generated previews |
| `resourcespace_include` | Configuration files |
| `resourcespace_db` | MariaDB data (local only) |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     LOCAL DEVELOPMENT                        │
│                docker compose --profile local up             │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐      ┌──────────────┐                     │
│  │ ResourceSpace│ ───► │   MariaDB    │                     │
│  │  :8080       │      │  Container   │                     │
│  └──────────────┘      └──────────────┘                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   STAGING / PRODUCTION                       │
│                     docker compose up                        │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐      ┌──────────────────────┐             │
│  │ ResourceSpace│ ───► │    Azure MySQL       │             │
│  │  :80         │      │  (Managed Service)   │             │
│  └──────────────┘      └──────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

---

## Azure App Service Deployment

### Prerequisites

- Azure Container Registry (ACR) or Docker Hub account
- Azure MySQL Flexible Server
- Azure Storage Account (for filestore persistence)

### Step 1: Push Image to Container Registry

```bash
cd services/resourcespace

# Option A: Azure Container Registry
az acr login --name yourregistry
docker build -t yourregistry.azurecr.io/resourcespace:latest .
docker push yourregistry.azurecr.io/resourcespace:latest

# Option B: Docker Hub
docker build -t yourusername/resourcespace:latest .
docker push yourusername/resourcespace:latest
```

### Step 2: Create App Service

```bash
# Create App Service Plan
az appservice plan create \
  --name resourcespace-plan \
  --resource-group your-rg \
  --is-linux \
  --sku B1

# Create Web App (Container)
az webapp create \
  --name your-resourcespace-app \
  --resource-group your-rg \
  --plan resourcespace-plan \
  --deployment-container-image-name yourregistry.azurecr.io/resourcespace:latest
```

### Step 3: Configure Environment Variables

On App Service, environment variables are set via **Application Settings** (not `.env` files):

```bash
az webapp config appsettings set \
  --resource-group your-rg \
  --name your-resourcespace-app \
  --settings \
    DB_HOST="your-server.mysql.database.azure.com" \
    DB_NAME="resourcespace" \
    DB_USER="user@your-server" \
    DB_PASSWORD="your-secure-password" \
    RS_BASE_URL="https://your-resourcespace-app.azurewebsites.net" \
    RS_APP_NAME="Brompton Digital Asset Management" \
    RS_SCRAMBLE_KEY="$(openssl rand -hex 32)" \
    RS_API_SCRAMBLE_KEY="$(openssl rand -hex 32)" \
    RS_EMAIL_FROM="noreply@brompton.com" \
    RS_EMAIL_NOTIFY="admin@brompton.com" \
    WEBSITES_PORT="80"
```

### Step 4: Configure Persistent Storage (Azure Files)

⚠️ **Critical**: App Service containers don't persist data by default. Mount Azure Files for the filestore:

```bash
# Create Storage Account (if not exists)
az storage account create \
  --name yourstorageaccount \
  --resource-group your-rg \
  --sku Standard_LRS

# Get storage key
STORAGE_KEY=$(az storage account keys list \
  --account-name yourstorageaccount \
  --resource-group your-rg \
  --query "[0].value" -o tsv)

# Create File Share
az storage share create \
  --name resourcespace-filestore \
  --account-name yourstorageaccount

# Mount to App Service
az webapp config storage-account add \
  --resource-group your-rg \
  --name your-resourcespace-app \
  --custom-id filestore \
  --storage-type AzureFiles \
  --share-name resourcespace-filestore \
  --account-name yourstorageaccount \
  --access-key "$STORAGE_KEY" \
  --mount-path /var/www/html/filestore
```

### Step 5: Configure Azure MySQL Firewall

Allow App Service to connect to MySQL:

```bash
# Allow all Azure services
az mysql flexible-server firewall-rule create \
  --resource-group your-rg \
  --name your-mysql-server \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### Step 6: Access and Complete Setup

1. Navigate to `https://your-resourcespace-app.azurewebsites.net`
2. Complete the ResourceSpace setup wizard
3. Enter Azure MySQL connection details when prompted

### Azure Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AZURE APP SERVICE                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐                                       │
│  │   App Service    │                                       │
│  │   (Container)    │                                       │
│  │                  │                                       │
│  │  ResourceSpace   │                                       │
│  └────────┬─────────┘                                       │
│           │                                                  │
│     ┌─────┴─────┐                                           │
│     │           │                                           │
│     ▼           ▼                                           │
│  ┌──────────┐  ┌──────────────┐                             │
│  │  Azure   │  │ Azure MySQL  │                             │
│  │  Files   │  │  Flexible    │                             │
│  │(filestore)│  │   Server    │                             │
│  └──────────┘  └──────────────┘                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Deployment Checklist

| Step | Action | Status |
|------|--------|--------|
| 1 | Build and push Docker image to registry | ⬜ |
| 2 | Create App Service (Container) | ⬜ |
| 3 | Set environment variables in App Service | ⬜ |
| 4 | Create Azure Storage Account | ⬜ |
| 5 | Mount Azure Files for filestore | ⬜ |
| 6 | Configure MySQL firewall rules | ⬜ |
| 7 | Set `WEBSITES_PORT=80` | ⬜ |
| 8 | Set correct `RS_BASE_URL` | ⬜ |
| 9 | Run RS setup wizard | ⬜ |

---

## Build Details

The Dockerfile:
1. Uses Ubuntu 22.04 as base
2. Installs all required dependencies (PHP, Apache, ImageMagick, FFmpeg, etc.)
3. Clones ResourceSpace from official GitHub repository
4. Configures Apache to allow `.htaccess` overrides
5. Sets up cron jobs for scheduled tasks
6. Applies custom configuration from `config/config.php`

## Troubleshooting

### Blank page during setup
- **Cause**: Wrong database host (using `localhost` instead of `mariadb`)
- **Fix**: Use `mariadb` as the database host in Docker

### Connection refused to database
- **Cause**: MariaDB container not running or not healthy
- **Fix**: Check with `docker compose ps` and `docker compose logs mariadb`

### Security key errors
- **Cause**: Empty or invalid `RS_SCRAMBLE_KEY` / `RS_API_SCRAMBLE_KEY`
- **Fix**: Generate new keys with `openssl rand -hex 32`

### Build takes too long
- **Cause**: Cloning ResourceSpace repo and installing dependencies
- **Fix**: This is normal for first build. Subsequent builds use cache.

### Azure: Container not starting
- **Cause**: Missing `WEBSITES_PORT` setting
- **Fix**: Set `WEBSITES_PORT=80` in App Service configuration

### Azure: Filestore data lost on restart
- **Cause**: Azure Files not mounted
- **Fix**: Mount Azure Files to `/var/www/html/filestore`

### Azure: Database connection timeout
- **Cause**: MySQL firewall blocking App Service
- **Fix**: Add firewall rule to allow Azure services (0.0.0.0)

## References

- [Official ResourceSpace Docker Repository](https://github.com/resourcespace/docker)
- [ResourceSpace Docker Installation Guide](https://www.resourcespace.com/knowledge-base/systemadmin/install_docker)
- [ResourceSpace Configuration Options](https://www.resourcespace.com/knowledge-base/systemadmin/config_file)
- [Azure App Service Container Docs](https://docs.microsoft.com/en-us/azure/app-service/configure-custom-container)
- [Azure Files Mount for App Service](https://docs.microsoft.com/en-us/azure/app-service/configure-connect-to-azure-storage)

## Notes

- ResourceSpace is built from source during Docker build (no pre-built image available)
- Local development uses MariaDB container (via `--profile local`)
- Staging/Production connects to Azure MySQL (no profile needed)
- For Azure deployment, use Azure Files for persistent filestore storage
- Environment variables on App Service are set via Application Settings, not `.env` files
- All configuration is via environment variables for flexibility
