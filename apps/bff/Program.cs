using Brompton.DigitalAssetManager.Bff.Configuration;
using Brompton.DigitalAssetManager.Bff.Endpoints;
using Brompton.DigitalAssetManager.Bff.Infrastructure;
using Brompton.DigitalAssetManager.Bff.Infrastructure.Logging;
using Brompton.DigitalAssetManager.Bff.Services;
using Polly;
using Polly.Extensions.Http;
using Serilog;
using Serilog.Events;
using Serilog.Formatting.Json;

// Configure Serilog early for startup logging
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
    .MinimumLevel.Override("System.Net.Http", LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .Enrich.WithEnvironmentName()
    .Enrich.WithMachineName()
    .WriteTo.Console(new JsonFormatter())
    .CreateBootstrapLogger();

try
{
    Log.Information("Starting Brompton Digital Asset Manager BFF");

    var builder = WebApplication.CreateBuilder(args);

    // Configure Serilog from appsettings
    builder.Host.UseSerilog((context, services, config) => config
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .Enrich.WithEnvironmentName()
        .Enrich.WithMachineName()
        .Enrich.WithProperty("Application", "Brompton.DigitalAssetManager.Bff")
        .WriteTo.Console(new JsonFormatter())
        .WriteTo.File(
            new JsonFormatter(),
            "logs/bff-.log",
            rollingInterval: RollingInterval.Day,
            retainedFileCountLimit: 30,
            fileSizeLimitBytes: 100_000_000)); // 100MB per file

    // Bind configuration
    builder.Services.Configure<ResourceSpaceOptions>(
        builder.Configuration.GetSection(ResourceSpaceOptions.SectionName));

    // Register scoped API key context
    builder.Services.AddScoped<ApiKeyContext>();

    // Configure HTTP client for ResourceSpace with retry policy
    builder.Services.AddHttpClient<IResourceSpaceClient, ResourceSpaceClient>(client =>
    {
        var options = builder.Configuration
            .GetSection(ResourceSpaceOptions.SectionName)
            .Get<ResourceSpaceOptions>() ?? new ResourceSpaceOptions();
        
        client.Timeout = TimeSpan.FromSeconds(options.TimeoutSeconds);
        client.DefaultRequestHeaders.Add("Accept", "application/json");
    })
    .AddPolicyHandler(GetRetryPolicy())
    .AddPolicyHandler(GetCircuitBreakerPolicy());

    // Add OpenAPI support
    builder.Services.AddOpenApi();

    // Add CORS for Bloomreach integration
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("BloomreachPolicy", policy =>
        {
            policy.AllowAnyOrigin() // Bloomreach iframe - adjust as needed
                  .AllowAnyMethod()
                  .AllowAnyHeader()
                  .WithExposedHeaders("X-Correlation-Id");
        });
    });

    var app = builder.Build();

    // Configure the HTTP request pipeline

    // Add correlation ID and log context enrichment first
    app.UseLogContextEnricher();

    // Serilog request logging
    app.UseSerilogRequestLogging(options =>
    {
        options.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
        {
            diagnosticContext.Set("RequestHost", httpContext.Request.Host.Value);
            diagnosticContext.Set("UserAgent", httpContext.Request.Headers.UserAgent.ToString());
        };
        options.MessageTemplate = "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000}ms";
    });

    // CORS
    app.UseCors("BloomreachPolicy");

    // API key extraction middleware
    app.UseApiKeyAuth();

    // OpenAPI/Swagger in development
    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
    }

    // Health check endpoint
    app.MapGet("/health", () => Results.Ok(new 
    { 
        status = "healthy", 
        timestamp = DateTime.UtcNow,
        version = "1.0.0"
    }))
    .WithName("HealthCheck")
    .WithTags("System")
    .ExcludeFromDescription();

    // Map API endpoints
    app.MapSearchEndpoints();
    app.MapCollectionEndpoints();
    app.MapAssetEndpoints();

    Log.Information("Brompton Digital Asset Manager BFF started successfully");

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}

/// <summary>
/// Retry policy for transient HTTP failures.
/// </summary>
static IAsyncPolicy<HttpResponseMessage> GetRetryPolicy()
{
    return HttpPolicyExtensions
        .HandleTransientHttpError()
        .WaitAndRetryAsync(3, retryAttempt => 
            TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
            onRetry: (outcome, timespan, retryAttempt, context) =>
            {
                Log.Warning(
                    "Retry {RetryAttempt} for HTTP request after {Delay}ms due to {Reason}",
                    retryAttempt, 
                    timespan.TotalMilliseconds,
                    outcome.Exception?.Message ?? outcome.Result?.StatusCode.ToString());
            });
}

/// <summary>
/// Circuit breaker policy to prevent cascading failures.
/// </summary>
static IAsyncPolicy<HttpResponseMessage> GetCircuitBreakerPolicy()
{
    return HttpPolicyExtensions
        .HandleTransientHttpError()
        .CircuitBreakerAsync(5, TimeSpan.FromSeconds(30),
            onBreak: (outcome, timespan) =>
            {
                Log.Warning(
                    "Circuit breaker opened for {Duration}s due to {Reason}",
                    timespan.TotalSeconds,
                    outcome.Exception?.Message ?? outcome.Result?.StatusCode.ToString());
            },
            onReset: () =>
            {
                Log.Information("Circuit breaker reset");
            });
}
