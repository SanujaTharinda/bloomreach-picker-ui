namespace Brompton.DigitalAssetManager.Bff.Configuration;

/// <summary>
/// Configuration options for ResourceSpace API connectivity.
/// </summary>
public class ResourceSpaceOptions
{
    public const string SectionName = "ResourceSpace";

    /// <summary>
    /// Base URL of the ResourceSpace instance (e.g., http://localhost).
    /// </summary>
    public string BaseUrl { get; set; } = "http://localhost";

    /// <summary>
    /// Default API user for ResourceSpace API calls.
    /// </summary>
    public string DefaultUser { get; set; } = "admin";

    /// <summary>
    /// Default page size for paginated results.
    /// </summary>
    public int DefaultPageSize { get; set; } = 20;

    /// <summary>
    /// Maximum allowed page size.
    /// </summary>
    public int MaxPageSize { get; set; } = 100;

    /// <summary>
    /// HTTP request timeout in seconds.
    /// </summary>
    public int TimeoutSeconds { get; set; } = 30;
}

