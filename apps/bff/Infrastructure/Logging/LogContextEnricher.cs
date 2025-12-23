using Serilog.Context;

namespace Brompton.DigitalAssetManager.Bff.Infrastructure.Logging;

/// <summary>
/// Middleware that enriches log context with correlation ID and other request-specific data.
/// </summary>
public class LogContextEnricherMiddleware
{
    private readonly RequestDelegate _next;

    public LogContextEnricherMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Use the built-in TraceIdentifier as correlation ID
        var correlationId = context.TraceIdentifier;

        // Enrich all logs within this request scope
        using (LogContext.PushProperty("CorrelationId", correlationId))
        using (LogContext.PushProperty("RequestPath", context.Request.Path.Value))
        using (LogContext.PushProperty("RequestMethod", context.Request.Method))
        using (LogContext.PushProperty("ClientIP", context.Connection.RemoteIpAddress?.ToString() ?? "unknown"))
        {
            // Add correlation ID to response headers for client-side debugging
            context.Response.Headers["X-Correlation-Id"] = correlationId;
            
            await _next(context);
        }
    }
}

/// <summary>
/// Extension methods for LogContextEnricherMiddleware.
/// </summary>
public static class LogContextEnricherMiddlewareExtensions
{
    public static IApplicationBuilder UseLogContextEnricher(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<LogContextEnricherMiddleware>();
    }
}

