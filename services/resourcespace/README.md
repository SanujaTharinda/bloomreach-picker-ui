# ResourceSpace Docker Configuration

Custom Docker setup for ResourceSpace DAM.

Based on the [official ResourceSpace Docker installation guide](https://www.resourcespace.com/knowledge-base/systemadmin/install_docker).

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
├── Dockerfile              # Custom image based on official RS
├── docker-compose.yml      # Multi-environment setup with profiles
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

## Notes

- The official ResourceSpace Docker image is used as the base
- Local development uses MariaDB container (via `--profile local`)
- Staging/Production connects to Azure MySQL (no profile needed)
- For production, consider Azure Blob Storage for filestore
- All configuration is via environment variables for flexibility
