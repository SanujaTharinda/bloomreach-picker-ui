using Brompton.DigitalAssetManager.Bff.Models;
using Brompton.DigitalAssetManager.Bff.Models.ResourceSpace;

namespace Brompton.DigitalAssetManager.Bff.Services;

/// <summary>
/// Interface for ResourceSpace API client operations.
/// </summary>
public interface IResourceSpaceClient
{
    /// <summary>
    /// Search for resources matching the query.
    /// </summary>
    /// <param name="query">Search query text.</param>
    /// <param name="page">Page number (1-based).</param>
    /// <param name="pageSize">Number of items per page.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Paginated list of assets with thumbnails.</returns>
    Task<PagedResult<AssetThumbnail>> SearchAssetsAsync(
        string query, 
        int page, 
        int pageSize, 
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get featured collections for a specific parent (lazy loading).
    /// Uses ResourceSpace's get_featured_collections API.
    /// </summary>
    /// <param name="parent">Parent collection ID. Use 0 for root-level collections.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>List of collection nodes at the specified level.</returns>
    Task<List<CollectionNode>> GetFeaturedCollectionsAsync(
        int parent = 0, 
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get assets in a specific collection.
    /// </summary>
    /// <param name="collectionId">Collection ID.</param>
    /// <param name="page">Page number (1-based).</param>
    /// <param name="pageSize">Number of items per page.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Paginated list of assets with thumbnails.</returns>
    Task<PagedResult<AssetThumbnail>> GetCollectionAssetsAsync(
        string collectionId, 
        int page, 
        int pageSize, 
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get detailed information about a specific asset.
    /// </summary>
    /// <param name="assetId">Asset/resource ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Full asset details including URLs and metadata.</returns>
    Task<AssetDetail?> GetAssetDetailAsync(
        string assetId, 
        CancellationToken cancellationToken = default);
}

