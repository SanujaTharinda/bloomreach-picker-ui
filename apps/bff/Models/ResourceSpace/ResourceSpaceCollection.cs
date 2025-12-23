using System.Text.Json.Serialization;

namespace Brompton.DigitalAssetManager.Bff.Models.ResourceSpace;

/// <summary>
/// Represents a featured collection as returned by ResourceSpace get_featured_collections API.
/// Used for lazy-loading collection hierarchy in the asset picker.
/// </summary>
public class ResourceSpaceCollection
{
    [JsonPropertyName("ref")]
    public int Ref { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("type")]
    public int? Type { get; set; }

    [JsonPropertyName("parent")]
    public int? Parent { get; set; }

    [JsonPropertyName("created")]
    public string? Created { get; set; }

    [JsonPropertyName("order_by")]
    public int? OrderBy { get; set; }

    [JsonPropertyName("thumbnail_selection_method")]
    public int? ThumbnailSelectionMethod { get; set; }

    [JsonPropertyName("bg_img_resource_ref")]
    public int? BgImgResourceRef { get; set; }

    [JsonPropertyName("savedsearch")]
    public string? SavedSearch { get; set; }

    /// <summary>
    /// Indicates if this collection has resources (assets) directly in it.
    /// 1 = has resources, 0 = no resources
    /// </summary>
    [JsonPropertyName("has_resources")]
    public int HasResources { get; set; }

    /// <summary>
    /// Indicates if this collection has child collections.
    /// 1 = has children (can expand), 0 = is leaf collection
    /// </summary>
    [JsonPropertyName("has_children")]
    public int HasChildren { get; set; }

    /// <summary>
    /// Returns the ref as a string for use in URLs and mappings.
    /// </summary>
    public string RefString => Ref.ToString();
}
