using System.Text.Json.Serialization;

namespace Brompton.DigitalAssetManager.Bff.Models.ResourceSpace;

/// <summary>
/// Represents a resource as returned by ResourceSpace do_search API.
/// Note: ResourceSpace returns numeric IDs as integers, not strings.
/// </summary>
public class ResourceSpaceResource
{
    [JsonPropertyName("ref")]
    public int Ref { get; set; }

    [JsonPropertyName("field8")]
    public string? Title { get; set; }

    [JsonPropertyName("field3")]
    public string? Description { get; set; }

    [JsonPropertyName("file_extension")]
    public string? FileExtension { get; set; }

    [JsonPropertyName("file_size")]
    public long? FileSize { get; set; }

    [JsonPropertyName("resource_type")]
    public int? ResourceType { get; set; }

    [JsonPropertyName("creation_date")]
    public string? CreationDate { get; set; }

    [JsonPropertyName("modified")]
    public string? Modified { get; set; }

    [JsonPropertyName("thumb_width")]
    public int? ThumbWidth { get; set; }

    [JsonPropertyName("thumb_height")]
    public int? ThumbHeight { get; set; }

    [JsonPropertyName("has_image")]
    public int? HasImage { get; set; }

    /// <summary>
    /// Returns the ref as a string for use in URLs and mappings.
    /// </summary>
    public string RefString => Ref.ToString();
}

/// <summary>
/// Represents detailed resource data from get_resource_data API.
/// </summary>
public class ResourceSpaceResourceData
{
    [JsonPropertyName("ref")]
    public int Ref { get; set; }

    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("resource_type")]
    public int? ResourceType { get; set; }

    [JsonPropertyName("file_extension")]
    public string? FileExtension { get; set; }

    [JsonPropertyName("file_size")]
    public long? FileSize { get; set; }

    [JsonPropertyName("creation_date")]
    public string? CreationDate { get; set; }

    [JsonPropertyName("modified")]
    public string? Modified { get; set; }

    [JsonPropertyName("image_red_width")]
    public int? Width { get; set; }

    [JsonPropertyName("image_red_height")]
    public int? Height { get; set; }

    [JsonPropertyName("thumb_width")]
    public int? ThumbWidth { get; set; }

    [JsonPropertyName("thumb_height")]
    public int? ThumbHeight { get; set; }

    /// <summary>
    /// Returns the ref as a string for use in URLs and mappings.
    /// </summary>
    public string RefString => Ref.ToString();
}

