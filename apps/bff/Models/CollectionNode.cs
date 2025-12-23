using System.Text.Json.Serialization;

namespace Brompton.DigitalAssetManager.Bff.Models;

/// <summary>
/// Represents a collection node for lazy-loading tree display.
/// Used with antd Tree component's loadData feature.
/// </summary>
public class CollectionNode
{
    /// <summary>
    /// Unique identifier of the collection (used as tree node key).
    /// </summary>
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// Display name of the collection.
    /// </summary>
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Indicates whether this collection contains assets (resources) directly.
    /// If true, clicking this collection will show its assets.
    /// </summary>
    [JsonPropertyName("hasResources")]
    public bool HasResources { get; set; }

    /// <summary>
    /// Indicates whether this collection has child collections.
    /// If true, this node can be expanded to load children (isLeaf = false in antd).
    /// If false, this is a leaf node (isLeaf = true in antd).
    /// </summary>
    [JsonPropertyName("hasChildren")]
    public bool HasChildren { get; set; }
}

