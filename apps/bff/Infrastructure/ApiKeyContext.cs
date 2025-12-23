namespace Brompton.DigitalAssetManager.Bff.Infrastructure;

/// <summary>
/// Scoped service to hold the API key extracted from the request.
/// This allows the ResourceSpaceClient to access the API key for signing requests.
/// </summary>
public class ApiKeyContext
{
    /// <summary>
    /// The ResourceSpace API key extracted from the Authorization header.
    /// </summary>
    public string? ApiKey { get; set; }

    /// <summary>
    /// Indicates whether a valid API key was provided.
    /// </summary>
    public bool HasApiKey => !string.IsNullOrEmpty(ApiKey);
}

