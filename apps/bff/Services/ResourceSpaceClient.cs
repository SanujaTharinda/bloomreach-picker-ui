using System.Diagnostics;
using System.Text.Json;
using Brompton.DigitalAssetManager.Bff.Configuration;
using Brompton.DigitalAssetManager.Bff.Infrastructure;
using Brompton.DigitalAssetManager.Bff.Models;
using Brompton.DigitalAssetManager.Bff.Models.ResourceSpace;
using Microsoft.Extensions.Options;

namespace Brompton.DigitalAssetManager.Bff.Services;

/// <summary>
/// HTTP client for ResourceSpace API with comprehensive logging and batch processing.
/// </summary>
public class ResourceSpaceClient : IResourceSpaceClient
{
    private readonly HttpClient _httpClient;
    private readonly ApiKeyContext _apiKeyContext;
    private readonly ResourceSpaceOptions _options;
    private readonly ILogger<ResourceSpaceClient> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public ResourceSpaceClient(
        HttpClient httpClient,
        ApiKeyContext apiKeyContext,
        IOptions<ResourceSpaceOptions> options,
        ILogger<ResourceSpaceClient> logger)
    {
        _httpClient = httpClient;
        _apiKeyContext = apiKeyContext;
        _options = options.Value;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<PagedResult<AssetThumbnail>> SearchAssetsAsync(
        string query,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();
        
        _logger.LogInformation(
            "Starting asset search: Query={Query}, Page={Page}, PageSize={PageSize}",
            query, page, pageSize);

        var offset = (page - 1) * pageSize;
        var parameters = new Dictionary<string, string>
        {
            ["search"] = query ?? string.Empty,
            ["fetchrows"] = pageSize.ToString(),
            ["offset"] = offset.ToString(),
            ["order_by"] = "relevance",
            ["sort"] = "desc"
        };

        var resources = await CallApiAsync<List<ResourceSpaceResource>>("do_search", parameters, cancellationToken);
        
        if (resources == null || resources.Count == 0)
        {
            _logger.LogInformation(
                "Search completed with no results in {ElapsedMs}ms",
                stopwatch.ElapsedMilliseconds);

            return new PagedResult<AssetThumbnail>
            {
                Items = [],
                Page = page,
                PageSize = pageSize,
                TotalCount = 0
            };
        }

        _logger.LogInformation(
            "Search returned {Count} resources, now fetching thumbnails via batch API",
            resources.Count);

        // Fetch thumbnails using batch API
        var assets = await EnrichWithThumbnailsAsync(resources, cancellationToken);

        _logger.LogInformation(
            "Search completed: {Count} assets enriched with thumbnails in {ElapsedMs}ms",
            assets.Count, stopwatch.ElapsedMilliseconds);

        return new PagedResult<AssetThumbnail>
        {
            Items = assets,
            Page = page,
            PageSize = pageSize,
            TotalCount = resources.Count >= pageSize ? (page * pageSize) + 1 : (page - 1) * pageSize + resources.Count
        };
    }

    /// <inheritdoc />
    public async Task<List<CollectionNode>> GetFeaturedCollectionsAsync(
        int parent = 0,
        CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();
        
        _logger.LogInformation(
            "Fetching featured collections: Parent={Parent}",
            parent);

        var parameters = new Dictionary<string, string>
        {
            ["parent"] = parent.ToString()
        };

        var collections = await CallApiAsync<List<ResourceSpaceCollection>>(
            "get_featured_collections",
            parameters,
            cancellationToken);

        if (collections == null || collections.Count == 0)
        {
            _logger.LogInformation(
                "No featured collections found for Parent={Parent} in {ElapsedMs}ms",
                parent, stopwatch.ElapsedMilliseconds);

            return [];
        }

        // Map to CollectionNode - no extra API calls needed!
        var nodes = collections.Select(c => new CollectionNode
        {
            Id = c.RefString,
            Name = c.Name ?? $"Collection {c.Ref}",
            HasResources = c.HasResources == 1,
            HasChildren = c.HasChildren == 1
        }).ToList();

        _logger.LogInformation(
            "Featured collections fetched: {Count} collections for Parent={Parent} in {ElapsedMs}ms",
            nodes.Count, parent, stopwatch.ElapsedMilliseconds);

        return nodes;
    }

    /// <inheritdoc />
    public async Task<PagedResult<AssetThumbnail>> GetCollectionAssetsAsync(
        string collectionId,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();
        
        _logger.LogInformation(
            "Fetching collection assets: CollectionId={CollectionId}, Page={Page}, PageSize={PageSize}",
            collectionId, page, pageSize);

        // Use search with collection filter
        var searchQuery = $"!collection{collectionId}";
        var offset = (page - 1) * pageSize;
        
        var parameters = new Dictionary<string, string>
        {
            ["search"] = searchQuery,
            ["fetchrows"] = pageSize.ToString(),
            ["offset"] = offset.ToString()
        };

        var resources = await CallApiAsync<List<ResourceSpaceResource>>("do_search", parameters, cancellationToken);

        if (resources == null || resources.Count == 0)
        {
            _logger.LogInformation(
                "Collection {CollectionId} has no assets, completed in {ElapsedMs}ms",
                collectionId, stopwatch.ElapsedMilliseconds);

            return new PagedResult<AssetThumbnail>
            {
                Items = [],
                Page = page,
                PageSize = pageSize,
                TotalCount = 0
            };
        }

        _logger.LogInformation(
            "Collection has {Count} resources, fetching thumbnails via batch API",
            resources.Count);

        var assets = await EnrichWithThumbnailsAsync(resources, cancellationToken);

        _logger.LogInformation(
            "Collection assets fetched: {Count} assets with thumbnails in {ElapsedMs}ms",
            assets.Count, stopwatch.ElapsedMilliseconds);

        return new PagedResult<AssetThumbnail>
        {
            Items = assets,
            Page = page,
            PageSize = pageSize,
            TotalCount = resources.Count >= pageSize ? (page * pageSize) + 1 : (page - 1) * pageSize + resources.Count
        };
    }

    /// <inheritdoc />
    public async Task<AssetDetail?> GetAssetDetailAsync(
        string assetId,
        CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();
        
        _logger.LogInformation("Fetching asset detail: AssetId={AssetId}", assetId);

        // Fetch resource metadata
        var resourceData = await CallApiAsync<ResourceSpaceResourceData>(
            "get_resource_data",
            new Dictionary<string, string> { ["resource"] = assetId },
            cancellationToken);

        if (resourceData == null)
        {
            _logger.LogWarning(
                "Asset not found: AssetId={AssetId}, completed in {ElapsedMs}ms",
                assetId, stopwatch.ElapsedMilliseconds);
            return null;
        }

        // Fetch download URL
        var downloadUrl = await GetResourcePathAsync(assetId, "", cancellationToken);

        var asset = MapToAssetDetail(resourceData, downloadUrl);

        _logger.LogInformation(
            "Asset detail fetched: AssetId={AssetId}, Title={Title} in {ElapsedMs}ms",
            assetId, asset.Title, stopwatch.ElapsedMilliseconds);

        return asset;
    }

    #region Private Methods

    /// <summary>
    /// Makes an API call to ResourceSpace with logging.
    /// </summary>
    private async Task<T?> CallApiAsync<T>(
        string function,
        Dictionary<string, string>? parameters,
        CancellationToken cancellationToken)
    {
        EnsureApiKey();
        
        var stopwatch = Stopwatch.StartNew();
        var url = ResourceSpaceSignature.BuildSignedUrl(
            _options.BaseUrl,
            _options.DefaultUser,
            _apiKeyContext.ApiKey!,
            function,
            parameters);

        _logger.LogDebug(
            "RS API call starting: Function={Function}, ParamCount={ParamCount}",
            function, parameters?.Count ?? 0);

        try
        {
            var response = await _httpClient.GetAsync(url, cancellationToken);
            var content = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError(
                    "RS API call failed: Function={Function}, Status={StatusCode}, Response={Response}, ElapsedMs={ElapsedMs}",
                    function, response.StatusCode, content.Length > 500 ? content[..500] : content, stopwatch.ElapsedMilliseconds);
                
                throw new HttpRequestException($"ResourceSpace API returned {response.StatusCode}: {content}");
            }

            _logger.LogDebug(
                "RS API call completed: Function={Function}, ResponseLength={Length}, ElapsedMs={ElapsedMs}",
                function, content.Length, stopwatch.ElapsedMilliseconds);

            if (string.IsNullOrWhiteSpace(content) || content == "false" || content == "null")
            {
                return default;
            }

            return JsonSerializer.Deserialize<T>(content, JsonOptions);
        }
        catch (Exception ex) when (ex is not HttpRequestException)
        {
            _logger.LogError(ex,
                "RS API call exception: Function={Function}, Error={ErrorMessage}, ElapsedMs={ElapsedMs}",
                function, ex.Message, stopwatch.ElapsedMilliseconds);
            throw;
        }
    }

    /// <summary>
    /// Gets the URL for a single resource at a specific size.
    /// </summary>
    private async Task<string?> GetResourcePathAsync(
        string resourceId,
        string size,
        CancellationToken cancellationToken)
    {
        EnsureApiKey();
        
        var parameters = new Dictionary<string, string>
        {
            ["ref"] = resourceId,
            ["getfilepath"] = "false",
            ["size"] = size
        };

        var url = ResourceSpaceSignature.BuildSignedUrl(
            _options.BaseUrl,
            _options.DefaultUser,
            _apiKeyContext.ApiKey!,
            "get_resource_path",
            parameters);

        try
        {
            var response = await _httpClient.GetStringAsync(url, cancellationToken);
            
            // ResourceSpace returns the URL as a string (possibly quoted)
            var cleanUrl = response.Trim().Trim('"');
            
            return string.IsNullOrEmpty(cleanUrl) || cleanUrl == "false" ? null : cleanUrl;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "Failed to get resource path: ResourceId={ResourceId}, Size={Size}",
                resourceId, size);
            return null;
        }
    }

    /// <summary>
    /// Gets URLs for multiple resources at a specific size using batch API.
    /// ResourceSpace supports passing ref as a JSON array like [1,2,3].
    /// Returns a dictionary mapping resource ID to URL.
    /// Note: For single ID, ResourceSpace returns a plain string; for multiple IDs, it returns a dictionary.
    /// </summary>
    private async Task<Dictionary<int, string>> GetResourcePathsBatchAsync(
        IEnumerable<int> resourceIds,
        string size,
        CancellationToken cancellationToken)
    {
        EnsureApiKey();
        
        var idList = resourceIds.ToList();
        if (idList.Count == 0)
        {
            return new Dictionary<int, string>();
        }

        var stopwatch = Stopwatch.StartNew();
        
        // Format IDs as JSON array: [1,2,3]
        var refArray = ResourceSpaceSignature.FormatIdsAsJsonArray(idList);
        
        var parameters = new Dictionary<string, string>
        {
            ["ref"] = refArray,
            ["getfilepath"] = "false",
            ["size"] = size
        };

        // Use raw URL builder since ResourceSpace expects literal brackets
        var url = ResourceSpaceSignature.BuildSignedUrlRaw(
            _options.BaseUrl,
            _options.DefaultUser,
            _apiKeyContext.ApiKey!,
            "get_resource_path",
            parameters);

        _logger.LogDebug(
            "Batch get_resource_path: Fetching {Count} resource URLs, Size={Size}",
            idList.Count, size);

        try
        {
            var response = await _httpClient.GetStringAsync(url, cancellationToken);
            
            _logger.LogDebug(
                "Batch get_resource_path completed: ResponseLength={Length}, ElapsedMs={ElapsedMs}",
                response.Length, stopwatch.ElapsedMilliseconds);

            var result = new Dictionary<int, string>();
            
            if (string.IsNullOrWhiteSpace(response) || response == "false")
            {
                return result;
            }

            // Handle two response formats:
            // - Single ID: returns a plain string (the URL, possibly quoted)
            // - Multiple IDs: returns a dictionary { "1": "url1", "2": "url2" }
            var trimmedResponse = response.Trim();
            
            if (trimmedResponse.StartsWith('{'))
            {
                // Multiple IDs - parse as dictionary
                var urlMap = JsonSerializer.Deserialize<Dictionary<string, string>>(response, JsonOptions);
                
                if (urlMap != null)
                {
                    foreach (var (key, value) in urlMap)
                    {
                        if (int.TryParse(key, out var id) && !string.IsNullOrEmpty(value) && value != "false")
                        {
                            result[id] = value;
                        }
                    }
                }
            }
            else if (idList.Count == 1)
            {
                // Single ID - response is just the URL string (possibly quoted)
                var cleanUrl = trimmedResponse.Trim('"');
                if (!string.IsNullOrEmpty(cleanUrl) && cleanUrl != "false")
                {
                    result[idList[0]] = cleanUrl;
                }
            }

            _logger.LogDebug(
                "Batch get_resource_path parsed: {SuccessCount}/{TotalCount} URLs found",
                result.Count, idList.Count);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "Batch get_resource_path failed for {Count} resources, Size={Size}",
                idList.Count, size);
            return new Dictionary<int, string>();
        }
    }

    /// <summary>
    /// Enriches resources with thumbnail URLs using batch API call.
    /// Uses single batch request instead of multiple parallel calls for better performance.
    /// </summary>
    private async Task<List<AssetThumbnail>> EnrichWithThumbnailsAsync(
        List<ResourceSpaceResource> resources,
        CancellationToken cancellationToken)
    {
        var stopwatch = Stopwatch.StartNew();

        _logger.LogDebug(
            "Starting batch thumbnail fetch for {Count} resources",
            resources.Count);

        // Extract all resource IDs for batch call
        var resourceIds = resources
            .Select(r => r.Ref)
            .ToList();

        // Single batch call to get all thumbnail URLs
        var thumbnailUrls = await GetResourcePathsBatchAsync(resourceIds, "thm", cancellationToken);

        // Map resources to AssetThumbnails with their URLs
        var results = resources.Select(resource =>
        {
            thumbnailUrls.TryGetValue(resource.Ref, out var thumbnailUrl);
            return MapToAssetThumbnail(resource, thumbnailUrl);
        }).ToList();

        _logger.LogDebug(
            "Batch thumbnail fetch completed: {Count} thumbnails in {ElapsedMs}ms (single API call)",
            results.Count, stopwatch.ElapsedMilliseconds);

        return results;
    }

    /// <summary>
    /// Maps ResourceSpace resource to AssetThumbnail.
    /// </summary>
    private static AssetThumbnail MapToAssetThumbnail(ResourceSpaceResource resource, string? thumbnailUrl)
    {
        var dimensions = resource.ThumbWidth.HasValue && resource.ThumbHeight.HasValue
            ? $"{resource.ThumbWidth} x {resource.ThumbHeight}"
            : null;

        return new AssetThumbnail
        {
            Id = resource.RefString,
            Title = resource.Title ?? $"Resource {resource.Ref}",
            ThumbnailUrl = thumbnailUrl,
            Dimensions = dimensions,
            FileExtension = resource.FileExtension,
            ResourceType = resource.ResourceType?.ToString()
        };
    }

    /// <summary>
    /// Maps ResourceSpace data to AssetDetail for embedding.
    /// </summary>
    private static AssetDetail MapToAssetDetail(
        ResourceSpaceResourceData resourceData,
        string? downloadUrl)
    {
        int? width = resourceData.Width ?? resourceData.ThumbWidth;
        int? height = resourceData.Height ?? resourceData.ThumbHeight;

        return new AssetDetail
        {
            Id = resourceData.RefString,
            Title = resourceData.Title ?? $"Resource {resourceData.Ref}",
            Url = downloadUrl,
            FileExtension = resourceData.FileExtension,
            MimeType = GetMimeType(resourceData.FileExtension),
            Dimensions = width.HasValue && height.HasValue 
                ? new AssetDimensions { Width = width.Value, Height = height.Value }
                : null,
            FileSize = resourceData.FileSize
        };
    }

    /// <summary>
    /// Gets MIME type from file extension.
    /// </summary>
    private static string? GetMimeType(string? extension)
    {
        if (string.IsNullOrEmpty(extension))
            return null;

        return extension.ToLowerInvariant() switch
        {
            "jpg" or "jpeg" => "image/jpeg",
            "png" => "image/png",
            "gif" => "image/gif",
            "webp" => "image/webp",
            "svg" => "image/svg+xml",
            "bmp" => "image/bmp",
            "tiff" or "tif" => "image/tiff",
            "pdf" => "application/pdf",
            "doc" => "application/msword",
            "docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "xls" => "application/vnd.ms-excel",
            "xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "ppt" => "application/vnd.ms-powerpoint",
            "pptx" => "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "mp4" => "video/mp4",
            "mov" => "video/quicktime",
            "avi" => "video/x-msvideo",
            "mp3" => "audio/mpeg",
            "wav" => "audio/wav",
            "zip" => "application/zip",
            _ => $"application/{extension}"
        };
    }

    /// <summary>
    /// Ensures an API key is available.
    /// </summary>
    private void EnsureApiKey()
    {
        if (!_apiKeyContext.HasApiKey)
        {
            _logger.LogError("API call attempted without API key");
            throw new UnauthorizedAccessException("ResourceSpace API key is required. Provide it via Authorization: Bearer <api_key> header.");
        }
    }

    #endregion
}

