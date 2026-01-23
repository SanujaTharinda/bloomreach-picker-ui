using System.Text.Json.Serialization;

namespace Brompton.DigitalAssetManager.Bff.Models;

/// <summary>
/// Represents asset information for embedding in Bloomreach.
/// Contains essential metadata and download URL.
/// </summary>
public class AssetDetail
{
    /// <summary>
    /// Unique identifier of the asset in ResourceSpace.
    /// </summary>
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// Asset title/name (for alt text).
    /// </summary>
    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Asset description.
    /// </summary>
    [JsonPropertyName("description")]
    public string? Description { get; set; }

    /// <summary>
    /// URL to the original/full resolution file for embedding.
    /// </summary>
    [JsonPropertyName("url")]
    public string? Url { get; set; }

    /// <summary>
    /// File extension (e.g., "jpg", "png").
    /// </summary>
    [JsonPropertyName("fileExtension")]
    public string? FileExtension { get; set; }

    /// <summary>
    /// File size in bytes (if available).
    /// </summary>
    [JsonPropertyName("fileSize")]
    public long? FileSize { get; set; }

    /// <summary>
    /// Creation date of the asset.
    /// </summary>
    [JsonPropertyName("createdAt")]
    public string? CreatedAt { get; set; }

    /// <summary>
    /// Last modified date of the asset.
    /// </summary>
    [JsonPropertyName("modifiedAt")]
    public string? ModifiedAt { get; set; }
}

