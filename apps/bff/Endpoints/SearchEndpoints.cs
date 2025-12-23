using Brompton.DigitalAssetManager.Bff.Configuration;
using Brompton.DigitalAssetManager.Bff.Models;
using Brompton.DigitalAssetManager.Bff.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Brompton.DigitalAssetManager.Bff.Endpoints;

/// <summary>
/// Endpoints for asset search functionality.
/// </summary>
public static class SearchEndpoints
{
    public static void MapSearchEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/assets")
            .WithTags("Search");

        group.MapGet("/search", SearchAssets)
            .WithName("SearchAssets")
            .WithSummary("Search for assets")
            .WithDescription("Search for assets matching the query text across all metadata fields. Supports pagination.")
            .Produces<PagedResult<AssetThumbnail>>()
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status500InternalServerError);
    }

    /// <summary>
    /// Search for assets matching the query.
    /// </summary>
    private static async Task<IResult> SearchAssets(
        [FromQuery] string? query,
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
            "Search endpoint called: Query={Query}, Page={Page}, PageSize={PageSize}",
            query ?? "(empty)", page, pageSize);

        try
        {
            var result = await client.SearchAssetsAsync(query ?? string.Empty, page, pageSize, cancellationToken);
            
            logger.LogInformation(
                "Search endpoint returning {Count} items, TotalCount={TotalCount}",
                result.Items.Count, result.TotalCount);
            
            return Results.Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            logger.LogWarning(ex, "Unauthorized access to search endpoint");
            return Results.Unauthorized();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in search endpoint: {ErrorMessage}", ex.Message);
            return Results.Problem(
                title: "Search failed",
                detail: ex.Message,
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }
}

