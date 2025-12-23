using Brompton.DigitalAssetManager.Bff.Models;
using Brompton.DigitalAssetManager.Bff.Services;
using Microsoft.AspNetCore.Mvc;

namespace Brompton.DigitalAssetManager.Bff.Endpoints;

/// <summary>
/// Endpoints for individual asset operations.
/// </summary>
public static class AssetEndpoints
{
    public static void MapAssetEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/assets")
            .WithTags("Assets");

        group.MapGet("/{assetId}", GetAssetDetail)
            .WithName("GetAssetDetail")
            .WithSummary("Get asset details")
            .WithDescription("Returns detailed information about a specific asset including all URLs (full, thumbnail, preview) and metadata.")
            .Produces<AssetDetail>()
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status500InternalServerError);
    }

    /// <summary>
    /// Get detailed information about a specific asset.
    /// </summary>
    private static async Task<IResult> GetAssetDetail(
        string assetId,
        [FromServices] IResourceSpaceClient client,
        [FromServices] ILogger<Program> logger,
        CancellationToken cancellationToken)
    {
        logger.LogInformation("Asset detail endpoint called: AssetId={AssetId}", assetId);

        try
        {
            var result = await client.GetAssetDetailAsync(assetId, cancellationToken);

            if (result == null)
            {
                logger.LogWarning("Asset not found: AssetId={AssetId}", assetId);
                return Results.NotFound(new { message = $"Asset with ID '{assetId}' not found" });
            }
            
            logger.LogInformation(
                "Asset detail endpoint returning asset: AssetId={AssetId}, Title={Title}",
                result.Id, result.Title);
            
            return Results.Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            logger.LogWarning(ex, "Unauthorized access to asset detail endpoint");
            return Results.Unauthorized();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, 
                "Error in asset detail endpoint: AssetId={AssetId}, Error={ErrorMessage}", 
                assetId, ex.Message);
            return Results.Problem(
                title: "Failed to fetch asset details",
                detail: ex.Message,
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }
}

