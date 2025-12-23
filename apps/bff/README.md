# Brompton Digital Asset Manager BFF

Backend-for-Frontend (BFF) layer that integrates ResourceSpace DAM with Bloomreach Content SaaS.

## Overview

This service acts as a middleware between the Bloomreach asset picker UI and ResourceSpace DAM API, providing:

- **Search** - Full-text search across asset metadata
- **Collections** - Hierarchical collection tree with asset indicators
- **Collection Assets** - Paginated assets within a collection
- **Asset Details** - Full asset metadata with download/preview URLs

## Prerequisites

- .NET 10 SDK
- ResourceSpace instance (local or remote)
- ResourceSpace API key

## Configuration

### appsettings.json

```json
{
  "ResourceSpace": {
    "BaseUrl": "http://localhost",
    "DefaultUser": "admin",
    "DefaultPageSize": 20,
    "MaxPageSize": 100,
    "TimeoutSeconds": 30
  }
}
```

### Environment Variables

You can override settings using environment variables:

```bash
ResourceSpace__BaseUrl=http://your-resourcespace-url
ResourceSpace__DefaultUser=api_user
```

## Running the Application

### Option 1: Local Development (Recommended for Dev)

Running without Docker provides faster iteration with hot reload and easier debugging:

```bash
# From the apps/bff directory
dotnet run
```

The service will start on `http://localhost:5293` by default (configured in `Properties/launchSettings.json`).

**Benefits:**
- Hot reload with `dotnet watch run`
- Easier debugging with IDE integration
- No container overhead

### Option 2: Docker (For Testing Container Builds)

Use Docker when you need to test the containerised build locally:

```bash
# Build and run with docker-compose
docker-compose up -d

# Service available at http://localhost:5293
```

**When to use Docker locally:**
- Testing container configuration before deployment
- Simulating production-like environment
- Running alongside other containerised services

## API Endpoints

### Authentication

All endpoints require a ResourceSpace API key passed as a Bearer token:

```
Authorization: Bearer <resourcespace_api_key>
```

### 1. Search Assets

```
GET /api/assets/search?query={text}&page=1&pageSize=20
```

**Response:**
```json
{
  "items": [
    {
      "id": "123",
      "title": "mountain-banner.jpg",
      "thumbnailUrl": "http://rs/filestore/1/2/3_thm.jpg",
      "dimensions": "1920 x 1080",
      "fileExtension": "jpg",
      "resourceType": "1"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "totalCount": 156,
  "totalPages": 8,
  "hasNextPage": true,
  "hasPreviousPage": false
}
```

### 2. Get Collections (Lazy Loading)

```
GET /api/collections                    # Root level collections
GET /api/collections/{id}/children      # Children of specific collection
```

**Response:**
```json
[
  {
    "id": "5",
    "name": "Bikes",
    "hasResources": false,
    "hasChildren": true
  },
  {
    "id": "12",
    "name": "Dealers",
    "hasResources": true,
    "hasChildren": false
  }
]
```

**Fields:**
- `hasResources`: `true` if collection contains assets (can be clicked to show assets)
- `hasChildren`: `true` if collection has child collections (can be expanded in tree)

**Usage with antd Tree:**
```tsx
<Tree loadData={onLoadData} treeData={treeData} />

const mapNode = (node) => ({
  key: node.id,
  title: node.name,
  isLeaf: !node.hasChildren,     // No expand icon if no children
  selectable: node.hasResources, // Only selectable if has assets
});

const onLoadData = async (node) => {
  const children = await api.get(`/collections/${node.key}/children`);
  // Update tree with children
};
```

### 3. Get Collection Assets

```
GET /api/collections/{collectionId}/assets?page=1&pageSize=20
```

**Response:** Same format as Search Assets.

### 4. Get Asset Details

```
GET /api/assets/{assetId}
```

**Response:**
```json
{
  "id": "123",
  "title": "mountain-banner.jpg",
  "description": "Beautiful mountain landscape",
  "fullUrl": "http://rs/filestore/1/2/3.jpg",
  "thumbnailUrl": "http://rs/filestore/1/2/3_thm.jpg",
  "previewUrl": "http://rs/filestore/1/2/3_pre.jpg",
  "dimensions": { "width": 1920, "height": 1080 },
  "fileSize": 2456789,
  "fileExtension": "jpg",
  "mimeType": "image/jpeg",
  "metadata": {
    "keywords": "mountain, landscape",
    "photographer": "John Doe"
  },
  "createdAt": "2024-01-15T10:30:00Z",
  "modifiedAt": "2024-01-20T14:00:00Z"
}
```

### 5. Health Check

```
GET /health
```

## Logging

The application uses Serilog with structured JSON logging:

- **Console** - JSON formatted output
- **File** - Rolling daily logs in `logs/` directory

### Log Levels

| Environment | Default Level |
|-------------|--------------|
| Development | Debug |
| Production | Information |

### Correlation IDs

Each request is assigned a correlation ID (returned in `X-Correlation-Id` header) for distributed tracing.

### Log Example

```json
{
  "Timestamp": "2024-12-22T10:30:45.123Z",
  "Level": "Information",
  "MessageTemplate": "RS API call completed: {Function} in {ElapsedMs}ms",
  "Properties": {
    "Function": "do_search",
    "ElapsedMs": 145,
    "CorrelationId": "abc-123-def",
    "Application": "Brompton.DigitalAssetManager.Bff"
  }
}
```

## Performance Features

### Batch API Calls

ResourceSpace's API supports batch requests using a JSON array format for parameters (e.g., `ref=[1,2,3]`). The BFF leverages this to fetch data in **single API calls** instead of making individual requests per asset.

**Batch thumbnail fetching:**
- Fetches all thumbnail URLs for a page of assets in one call
- Uses raw (non-URL-encoded) query string for array parameters
- Signature calculated on raw query string: `SHA256(apiKey + "user=admin&function=get_resource_path&ref=[1,2,3]&...")`
- Response format: `{ "1": "url1", "2": "url2", ... }`

### Retry Policy

HTTP requests to ResourceSpace use exponential backoff retry (3 attempts) for transient failures.

### Circuit Breaker

A circuit breaker prevents cascading failures:
- Opens after 5 consecutive failures
- Stays open for 30 seconds
- Automatically resets

## Development

### Building

```bash
dotnet build
```

### Testing with cURL

These examples work for both local development (`dotnet run`) and local Docker testing (`docker-compose up`), as both use port 5293:

```bash
# Search
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:5293/api/assets/search?query=banner&page=1&pageSize=10"

# Collections
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:5293/api/collections"

# Collection Assets
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:5293/api/collections/1/assets?page=1&pageSize=20"

# Asset Detail
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:5293/api/assets/123"
```

### OpenAPI

In development mode, OpenAPI documentation is available at:
```
GET /openapi/v1.json
```

## Docker Support

### Local Docker Testing

```bash
# Build and run with docker-compose
docker-compose up -d

# Or build and run manually
docker build -t brompton-dam-bff .
docker run -d -p 5293:8080 \
  -e ResourceSpace__BaseUrl=http://your-resourcespace-url \
  brompton-dam-bff

# View logs
docker-compose logs -f bff

# Stop services
docker-compose down
```

### Staging/Production Deployment

For staging and production, bind to standard HTTP/HTTPS ports:

```bash
# Build image
docker build -t brompton-dam-bff:latest .

# Run with standard ports (behind reverse proxy)
docker run -d \
  -p 80:8080 \
  -e ASPNETCORE_ENVIRONMENT=Production \
  -e ResourceSpace__BaseUrl=https://your-resourcespace-url \
  brompton-dam-bff:latest

# Or with HTTPS termination at container level
docker run -d \
  -p 80:8080 \
  -p 443:8443 \
  -e ASPNETCORE_ENVIRONMENT=Production \
  -e ASPNETCORE_URLS="http://+:8080;https://+:8443" \
  -e ASPNETCORE_Kestrel__Certificates__Default__Path=/https/cert.pfx \
  -e ASPNETCORE_Kestrel__Certificates__Default__Password=${CERT_PASSWORD} \
  -v /path/to/certs:/https:ro \
  brompton-dam-bff:latest
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ASPNETCORE_ENVIRONMENT` | Environment (Development/Production) | Production |
| `ResourceSpace__BaseUrl` | ResourceSpace API URL | - |
| `ResourceSpace__DefaultUser` | Default RS user | admin |
| `ResourceSpace__TimeoutSeconds` | API timeout | 30 |

### Health Check

```bash
curl http://localhost/health
```

### Production Recommendations

1. **Use a container registry:**
   ```bash
   docker build -t your-registry/brompton-dam-bff:1.0.0 .
   docker push your-registry/brompton-dam-bff:1.0.0
   ```

2. **Configure secrets properly:**
   - Use Docker secrets, Azure Key Vault, or environment variables from CI/CD
   - Never commit API keys to the repository

3. **Use a reverse proxy (recommended):**
   - nginx, Traefik, or cloud load balancer for TLS termination
   - Centralised certificate management
   - Rate limiting and additional security

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Bloomreach Content SaaS                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              DAM Asset Picker UI (apps/web)            │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────┘
                          │ REST API
                          │ Authorization: Bearer {rs_api_key}
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    BFF API (apps/bff)                       │
│  ┌──────────┐  ┌─────────────────┐  ┌──────────────────┐   │
│  │ Endpoints │──│ ResourceSpace   │──│ Serilog          │   │
│  │ (Minimal) │  │ Client          │  │ Logging          │   │
│  └──────────┘  └─────────────────┘  └──────────────────┘   │
│                        │                                    │
│              ┌─────────┴─────────┐                         │
│              │ Polly Resilience  │                         │
│              │ (Retry + Breaker) │                         │
│              └───────────────────┘                         │
└─────────────────────────┬───────────────────────────────────┘
                          │ Signed API Calls (SHA256)
                          │ Batch requests for performance
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    ResourceSpace DAM                        │
│                      (REST API)                             │
└─────────────────────────────────────────────────────────────┘
```

## License

Proprietary - Brompton Bicycle Ltd.

