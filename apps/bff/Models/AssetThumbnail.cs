using System.Text.Json.Serialization;

namespace Brompton.DigitalAssetManager.Bff.Models;

/// <summary>
/// Represents an asset with thumbnail information for list views.
/// </summary>
public class AssetThumbnail
{
    /// <summary>
    /// Unique identifier of the asset in ResourceSpace.
    /// </summary>
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// Asset title/name.
    /// </summary>
    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// URL to the thumbnail image.
    /// </summary>
    [JsonPropertyName("thumbnailUrl")]
    public string? ThumbnailUrl { get; set; }

    /// <summary>
    /// Human-readable dimensions (e.g., "1920 x 1080").
    /// </summary>
    [JsonPropertyName("dimensions")]
    public string? Dimensions { get; set; }

    /// <summary>
    /// File extension (e.g., "jpg", "png").
    /// </summary>
    [JsonPropertyName("fileExtension")]
    public string? FileExtension { get; set; }

    /// <summary>
    /// Resource type name (e.g., "Photo", "Document").
    /// </summary>
    [JsonPropertyName("resourceType")]
    public string? ResourceType { get; set; }
}

