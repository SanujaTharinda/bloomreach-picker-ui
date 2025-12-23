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

```bash
cd src/Brompton.DigitalAssetManager.Bff
dotnet run
```

The service will start on `http://localhost:5000` by default.

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

### Batch Thumbnail Fetching

ResourceSpace's `get_resource_path` API supports batch requests using a JSON array format for the `ref` parameter (e.g., `ref=[1,2,3]`). The BFF leverages this to fetch all thumbnail URLs in a **single API call** instead of making individual requests per asset.

**Key implementation details:**
- Uses raw (non-URL-encoded) query string for array parameters
- Signature is calculated on the raw query string: `SHA256(apiKey + "user=admin&function=get_resource_path&ref=[1,2,3]&...")`
- Response format: `{ "1": "url1", "2": "url2", ... }`

**Performance comparison:**
- **Before (parallel)**: N API calls for N assets (configurable concurrency)
- **After (batch)**: 1 API call for N assets (~12ms for 4 assets in testing)

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

```bash
# Search
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:5000/api/assets/search?query=banner&page=1&pageSize=10"

# Collections
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:5000/api/collections"

# Collection Assets
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:5000/api/collections/1/assets?page=1&pageSize=20"

# Asset Detail
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:5000/api/assets/123"
```

### OpenAPI

In development mode, OpenAPI documentation is available at:
```
GET /openapi/v1.json
```

## Docker Support (Coming Soon)

```dockerfile
# Dockerfile example
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Brompton.DigitalAssetManager.Bff.dll"]
```

## Phase 2: Caching (Planned)

Future enhancements include:
- Memory cache for collection tree (60 min TTL)
- Thumbnail URL caching (30 min TTL)
- Manual cache invalidation endpoint

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Bloomreach Content SaaS                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                   Asset Picker UI                       │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────┘
                          │ Authorization: Bearer {api_key}
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Brompton.DigitalAssetManager.Bff               │
│  ┌──────────┐  ┌─────────────────┐  ┌──────────────────┐   │
│  │ Endpoints │──│ ResourceSpace   │──│ Structured       │   │
│  │           │  │ Client          │  │ Logging          │   │
│  └──────────┘  └─────────────────┘  └──────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │ Signed API Calls (SHA256)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    ResourceSpace DAM                         │
│                    (REST API)                                │
└─────────────────────────────────────────────────────────────┘
```

## License

Proprietary - Brompton Bicycle Ltd.

