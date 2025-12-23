namespace Brompton.DigitalAssetManager.Bff.Infrastructure;

/// <summary>
/// Middleware that extracts the ResourceSpace API key from the Authorization header
/// and stores it in the scoped ApiKeyContext for use by the ResourceSpaceClient.
/// </summary>
public class ApiKeyAuthMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ApiKeyAuthMiddleware> _logger;

    public ApiKeyAuthMiddleware(RequestDelegate next, ILogger<ApiKeyAuthMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, ApiKeyContext apiKeyContext)
    {
        var authHeader = context.Request.Headers.Authorization.FirstOrDefault();

        if (!string.IsNullOrEmpty(authHeader))
        {
            if (authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                var apiKey = authHeader["Bearer ".Length..].Trim();
                
                if (!string.IsNullOrEmpty(apiKey))
                {
                    apiKeyContext.ApiKey = apiKey;
                    _logger.LogDebug(
                        "API key extracted from Authorization header for request {Path}",
                        context.Request.Path);
                }
                else
                {
                    _logger.LogWarning(
                        "Empty API key in Authorization header for request {Path}",
                        context.Request.Path);
                }
            }
            else
            {
                _logger.LogWarning(
                    "Invalid Authorization header format for request {Path}. Expected 'Bearer <api_key>'",
                    context.Request.Path);
            }
        }
        else
        {
            _logger.LogWarning(
                "Missing Authorization header for request {Path}",
                context.Request.Path);
        }

        await _next(context);
    }
}

/// <summary>
/// Extension methods for ApiKeyAuthMiddleware.
/// </summary>
public static class ApiKeyAuthMiddlewareExtensions
{
    public static IApplicationBuilder UseApiKeyAuth(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<ApiKeyAuthMiddleware>();
    }
}

