using Brompton.DigitalAssetManager.Bff.Configuration;
using Brompton.DigitalAssetManager.Bff.Models;
using Brompton.DigitalAssetManager.Bff.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Brompton.DigitalAssetManager.Bff.Endpoints;

/// <summary>
/// Endpoints for collection management.
/// </summary>
public static class CollectionEndpoints
{
    public static void MapCollectionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/collections")
            .WithTags("Collections");

        // GET /api/collections - Root level featured collections
        group.MapGet("/", GetRootCollections)
            .WithName("GetRootCollections")
            .WithSummary("Get root-level featured collections")
            .WithDescription("Returns root-level featured collections. " +
                           "Each collection includes hasResources (can show assets) and hasChildren (can expand) flags.")
            .Produces<List<CollectionNode>>()
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status500InternalServerError);

        // GET /api/collections/{id}/children - Children of a specific collection
        group.MapGet("/{collectionId}/children", GetCollectionChildren)
            .WithName("GetCollectionChildren")
            .WithSummary("Get child collections")
            .WithDescription("Returns child collections of a specific collection for lazy loading tree expansion.")
            .Produces<List<CollectionNode>>()
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status500InternalServerError);

        // GET /api/collections/{id}/assets - Assets within a collection
        group.MapGet("/{collectionId}/assets", GetCollectionAssets)
            .WithName("GetCollectionAssets")
            .WithSummary("Get assets in a collection")
            .WithDescription("Returns paginated assets within a specific collection.")
            .Produces<PagedResult<AssetThumbnail>>()
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status500InternalServerError);
    }

    /// <summary>
    /// Get root-level featured collections.
    /// </summary>
    private static async Task<IResult> GetRootCollections(
        IResourceSpaceClient client,
        ILogger<Program> logger,
        CancellationToken cancellationToken = default)
    {
        logger.LogInformation("Root collections endpoint called");

        try
        {
            var result = await client.GetFeaturedCollectionsAsync(0, cancellationToken);
            
            logger.LogInformation(
                "Root collections endpoint returning {Count} collections",
                result.Count);
            
            return Results.Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            logger.LogWarning(ex, "Unauthorized access to root collections endpoint");
            return Results.Unauthorized();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in root collections endpoint: {ErrorMessage}", ex.Message);
            return Results.Problem(
                title: "Failed to fetch collections",
                detail: ex.Message,
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    /// <summary>
    /// Get child collections of a specific collection.
    /// </summary>
    private static async Task<IResult> GetCollectionChildren(
        string collectionId,
        IResourceSpaceClient client,
        ILogger<Program> logger,
        CancellationToken cancellationToken = default)
    {
        logger.LogInformation("Collection children endpoint called: CollectionId={CollectionId}", collectionId);

        if (!int.TryParse(collectionId, out var parentId) || parentId < 1)
        {
            return Results.BadRequest("Invalid collection ID");
        }

        try
        {
            var result = await client.GetFeaturedCollectionsAsync(parentId, cancellationToken);
            
            logger.LogInformation(
                "Collection children endpoint returning {Count} children for CollectionId={CollectionId}",
                result.Count, collectionId);
            
            return Results.Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            logger.LogWarning(ex, "Unauthorized access to collection children endpoint");
            return Results.Unauthorized();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in collection children endpoint: CollectionId={CollectionId}, Error={ErrorMessage}", 
                collectionId, ex.Message);
            return Results.Problem(
                title: "Failed to fetch collection children",
                detail: ex.Message,
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    /// <summary>
    /// Get paginated assets within a specific collection.
    /// </summary>
    private static async Task<IResult> GetCollectionAssets(
        string collectionId,
        [FromQuery] int page,
        [FromQuery] int pageSize,
        [FromServices] IResourceSpaceClient client,
        [FromServices] IOptions<ResourceSpaceOptions> options,
        [FromServices] ILogger<Program> logger,
        CancellationToken cancellationToken)
    {
        // Apply defaults and constraints
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = options.Value.DefaultPageSize;
        if (pageSize > options.Value.MaxPageSize) pageSize = options.Value.MaxPageSize;

        logger.LogInformation(
            "Collection assets endpoint called: CollectionId={CollectionId}, Page={Page}, PageSize={PageSize}",
            collectionId, page, pageSize);

        try
        {
            var result = await client.GetCollectionAssetsAsync(collectionId, page, pageSize, cancellationToken);
            
            logger.LogInformation(
                "Collection assets endpoint returning {Count} items, TotalCount={TotalCount}",
                result.Items.Count, result.TotalCount);
            
            return Results.Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            logger.LogWarning(ex, "Unauthorized access to collection assets endpoint");
            return Results.Unauthorized();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, 
                "Error in collection assets endpoint: CollectionId={CollectionId}, Error={ErrorMessage}", 
                collectionId, ex.Message);
            return Results.Problem(
                title: "Failed to fetch collection assets",
                detail: ex.Message,
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }
}

