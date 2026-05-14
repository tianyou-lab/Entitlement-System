using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Entitlement.Sdk;

public sealed record DeviceInfo(
    string DeviceCode,
    string Fingerprint,
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

    public LicenseClient(HttpClient http, string productCode)
    {
        this.http = http;
        this.productCode = productCode;
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
        using var response = await http.GetAsync(path, cancellationToken);
        return await ReadEnvelopeAsync<T>(response, cancellationToken);
    }

    private async Task<T> PostAsync<T>(string path, object body, CancellationToken cancellationToken)
    {
        using var response = await http.PostAsJsonAsync(path, body, JsonOptions, cancellationToken);
        return await ReadEnvelopeAsync<T>(response, cancellationToken);
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
