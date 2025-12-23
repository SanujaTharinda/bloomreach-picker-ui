using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Brompton.DigitalAssetManager.Bff.Infrastructure;

/// <summary>
/// Handles ResourceSpace API signature generation.
/// ResourceSpace requires SHA256(privateKey + queryString) for authentication.
/// </summary>
public static class ResourceSpaceSignature
{
    /// <summary>
    /// Generates the SHA256 signature required by ResourceSpace API.
    /// </summary>
    /// <param name="privateKey">The user's private API key.</param>
    /// <param name="queryString">The query string without the sign parameter.</param>
    /// <returns>Hex-encoded SHA256 hash.</returns>
    public static string Generate(string privateKey, string queryString)
    {
        var input = privateKey + queryString;
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexStringLower(bytes);
    }

    /// <summary>
    /// Builds a complete query string for ResourceSpace API (URL-encoded).
    /// </summary>
    /// <param name="user">API username.</param>
    /// <param name="function">API function name.</param>
    /// <param name="parameters">Additional parameters.</param>
    /// <returns>Query string without signature.</returns>
    public static string BuildQueryString(string user, string function, Dictionary<string, string>? parameters = null)
    {
        var parts = new List<string>
        {
            $"user={Uri.EscapeDataString(user)}",
            $"function={Uri.EscapeDataString(function)}"
        };

        if (parameters != null)
        {
            foreach (var (key, value) in parameters)
            {
                if (!string.IsNullOrEmpty(value))
                {
                    parts.Add($"{Uri.EscapeDataString(key)}={Uri.EscapeDataString(value)}");
                }
            }
        }

        return string.Join("&", parts);
    }

    /// <summary>
    /// Builds a raw query string without URL encoding (for signature generation with special chars like []).
    /// ResourceSpace expects the signature to be calculated on raw values when using array parameters.
    /// </summary>
    /// <param name="user">API username.</param>
    /// <param name="function">API function name.</param>
    /// <param name="parameters">Additional parameters (values should be raw, not URL-encoded).</param>
    /// <returns>Raw query string without signature.</returns>
    public static string BuildRawQueryString(string user, string function, Dictionary<string, string>? parameters = null)
    {
        var parts = new List<string>
        {
            $"user={user}",
            $"function={function}"
        };

        if (parameters != null)
        {
            foreach (var (key, value) in parameters)
            {
                if (!string.IsNullOrEmpty(value))
                {
                    parts.Add($"{key}={value}");
                }
            }
        }

        return string.Join("&", parts);
    }

    /// <summary>
    /// Builds a complete signed URL for ResourceSpace API.
    /// </summary>
    /// <param name="baseUrl">ResourceSpace base URL.</param>
    /// <param name="user">API username.</param>
    /// <param name="privateKey">User's private API key.</param>
    /// <param name="function">API function name.</param>
    /// <param name="parameters">Additional parameters.</param>
    /// <returns>Complete signed API URL.</returns>
    public static string BuildSignedUrl(
        string baseUrl, 
        string user, 
        string privateKey, 
        string function, 
        Dictionary<string, string>? parameters = null)
    {
        var queryString = BuildQueryString(user, function, parameters);
        var signature = Generate(privateKey, queryString);
        return $"{baseUrl.TrimEnd('/')}/api/?{queryString}&sign={signature}";
    }

    /// <summary>
    /// Builds a signed URL for batch operations with array parameters (like ref=[1,2]).
    /// Uses raw (non-encoded) query string for both signature and URL since ResourceSpace
    /// expects the literal brackets in array parameters.
    /// </summary>
    /// <param name="baseUrl">ResourceSpace base URL.</param>
    /// <param name="user">API username.</param>
    /// <param name="privateKey">User's private API key.</param>
    /// <param name="function">API function name.</param>
    /// <param name="parameters">Additional parameters (values should be raw).</param>
    /// <returns>Complete signed API URL with raw array syntax.</returns>
    public static string BuildSignedUrlRaw(
        string baseUrl, 
        string user, 
        string privateKey, 
        string function, 
        Dictionary<string, string>? parameters = null)
    {
        var queryString = BuildRawQueryString(user, function, parameters);
        var signature = Generate(privateKey, queryString);
        return $"{baseUrl.TrimEnd('/')}/api/?{queryString}&sign={signature}";
    }

    /// <summary>
    /// Formats a list of integers as a JSON array string for batch API calls.
    /// Example: [1, 2, 3] -> "[1,2,3]"
    /// </summary>
    /// <param name="ids">List of integer IDs.</param>
    /// <returns>JSON array string without spaces.</returns>
    public static string FormatIdsAsJsonArray(IEnumerable<int> ids)
    {
        return JsonSerializer.Serialize(ids);
    }
}

