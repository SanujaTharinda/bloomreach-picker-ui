using System.Text.Json.Serialization;

namespace Brompton.DigitalAssetManager.Bff.Models;

/// <summary>
/// Generic wrapper for paginated results.
/// </summary>
/// <typeparam name="T">Type of items in the result.</typeparam>
public class PagedResult<T>
{
    /// <summary>
    /// Collection of items for the current page.
    /// </summary>
    [JsonPropertyName("items")]
    public List<T> Items { get; set; } = [];

    /// <summary>
    /// Current page number (1-based).
    /// </summary>
    [JsonPropertyName("page")]
    public int Page { get; set; }

    /// <summary>
    /// Number of items per page.
    /// </summary>
    [JsonPropertyName("pageSize")]
    public int PageSize { get; set; }

    /// <summary>
    /// Total number of items across all pages.
    /// </summary>
    [JsonPropertyName("totalCount")]
    public int TotalCount { get; set; }

    /// <summary>
    /// Total number of pages.
    /// </summary>
    [JsonPropertyName("totalPages")]
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;

    /// <summary>
    /// Indicates if there are more pages after the current one.
    /// </summary>
    [JsonPropertyName("hasNextPage")]
    public bool HasNextPage => Page < TotalPages;

    /// <summary>
    /// Indicates if there are pages before the current one.
    /// </summary>
    [JsonPropertyName("hasPreviousPage")]
    public bool HasPreviousPage => Page > 1;
}

