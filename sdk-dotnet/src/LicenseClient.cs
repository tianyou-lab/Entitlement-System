using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Entitlement.Sdk;

public sealed record DeviceInfo(
    string DeviceCode,
    string FingerprintHash,
    string DeviceName,
    string OsType,
    string OsVersion,
    string AppVersion,
    IReadOnlyDictionary<string, object?>? HardwareSummary = null);

public sealed record ApiEnvelope<T>(string Code, string Message, T? Data);

public sealed record LicenseResult(
    string? LicenseKey,
    string? LeaseToken,
    DateTimeOffset? LeaseExpireAt,
    DateTimeOffset? ExpireAt,
    JsonElement? FeatureFlags,
    JsonElement? VersionPolicy);

public sealed class LicenseClient
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private readonly HttpClient http;
    private readonly string productCode;
    private readonly string? requestSigningSecret;

    public LicenseClient(HttpClient http, string productCode, string? requestSigningSecret = null)
    {
        this.http = http;
        this.productCode = productCode;
        this.requestSigningSecret = requestSigningSecret;
    }

    public Task<LicenseResult> ActivateAsync(string licenseKey, DeviceInfo device, CancellationToken cancellationToken = default)
    {
        return PostAsync<LicenseResult>("/api/v1/license/activate", new
        {
            ProductCode = productCode,
            LicenseKey = licenseKey,
            Device = device,
        }, cancellationToken);
    }

    public Task<LicenseResult> VerifyAsync(string leaseToken, string deviceCode, string appVersion, CancellationToken cancellationToken = default)
    {
        return PostAsync<LicenseResult>("/api/v1/license/verify", new
        {
            ProductCode = productCode,
            LeaseToken = leaseToken,
            DeviceCode = deviceCode,
            AppVersion = appVersion,
        }, cancellationToken);
    }

    public Task<LicenseResult> HeartbeatAsync(string leaseToken, string deviceCode, string appVersion, CancellationToken cancellationToken = default)
    {
        return PostAsync<LicenseResult>("/api/v1/license/heartbeat", new
        {
            ProductCode = productCode,
            LeaseToken = leaseToken,
            DeviceCode = deviceCode,
            AppVersion = appVersion,
        }, cancellationToken);
    }

    public Task<LicenseResult> DeactivateAsync(string licenseKey, string deviceCode, CancellationToken cancellationToken = default)
    {
        return PostAsync<LicenseResult>("/api/v1/license/deactivate", new
        {
            ProductCode = productCode,
            LicenseKey = licenseKey,
            DeviceCode = deviceCode,
        }, cancellationToken);
    }

    public Task<JsonElement> VersionPolicyAsync(CancellationToken cancellationToken = default)
    {
        return GetAsync<JsonElement>($"/api/v1/version/policy?productCode={Uri.EscapeDataString(productCode)}", cancellationToken);
    }

    private async Task<T> GetAsync<T>(string path, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, path);
        Sign(request, path, "{}");
        using var response = await http.SendAsync(request, cancellationToken);
        return await ReadEnvelopeAsync<T>(response, cancellationToken);
    }

    private async Task<T> PostAsync<T>(string path, object body, CancellationToken cancellationToken)
    {
        var json = JsonSerializer.Serialize(body, JsonOptions);
        var canonicalBody = Canonicalize(JsonSerializer.Deserialize<JsonElement>(json));
        using var request = new HttpRequestMessage(HttpMethod.Post, path)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json"),
        };
        Sign(request, path, canonicalBody);
        using var response = await http.SendAsync(request, cancellationToken);
        return await ReadEnvelopeAsync<T>(response, cancellationToken);
    }

    private void Sign(HttpRequestMessage request, string path, string canonicalBody)
    {
        if (string.IsNullOrWhiteSpace(requestSigningSecret)) return;
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();
        var nonce = Guid.NewGuid().ToString("N");
        var signature = SignPayload(requestSigningSecret, request.Method.Method, path, timestamp, nonce, canonicalBody);
        request.Headers.TryAddWithoutValidation("x-entitlement-timestamp", timestamp);
        request.Headers.TryAddWithoutValidation("x-entitlement-nonce", nonce);
        request.Headers.TryAddWithoutValidation("x-entitlement-signature", signature);
    }

    private static string SignPayload(string secret, string method, string path, string timestamp, string nonce, string canonicalBody)
    {
        var payload = string.Join('\n', method.ToUpperInvariant(), path, timestamp, nonce, canonicalBody);
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        return Base64UrlEncode(hmac.ComputeHash(Encoding.UTF8.GetBytes(payload)));
    }

    private static string Canonicalize(JsonElement element)
    {
        return element.ValueKind switch
        {
            JsonValueKind.Object => "{" + string.Join(',', element.EnumerateObject().OrderBy(property => property.Name, StringComparer.Ordinal).Select(property => JsonSerializer.Serialize(property.Name) + ":" + Canonicalize(property.Value))) + "}",
            JsonValueKind.Array => "[" + string.Join(',', element.EnumerateArray().Select(Canonicalize)) + "]",
            JsonValueKind.String => JsonSerializer.Serialize(element.GetString()),
            JsonValueKind.Number => element.GetRawText(),
            JsonValueKind.True => "true",
            JsonValueKind.False => "false",
            JsonValueKind.Null => "null",
            _ => element.GetRawText(),
        };
    }

    private static string Base64UrlEncode(byte[] bytes)
    {
        return Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }

    private static async Task<T> ReadEnvelopeAsync<T>(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        var envelope = await response.Content.ReadFromJsonAsync<ApiEnvelope<T>>(JsonOptions, cancellationToken);
        if (envelope is null) throw new EntitlementException("EMPTY_RESPONSE", "empty response");
        if (!response.IsSuccessStatusCode || envelope.Code != "OK") throw new EntitlementException(envelope.Code, envelope.Message);
        return envelope.Data ?? throw new EntitlementException("EMPTY_RESPONSE", "empty response data");
    }
}

public sealed class EntitlementException : Exception
{
    public string Code { get; }

    public EntitlementException(string code, string message) : base(message)
    {
        Code = code;
    }
}
