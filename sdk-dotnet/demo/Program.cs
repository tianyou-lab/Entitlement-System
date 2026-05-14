using Entitlement.Sdk;

var apiBaseUrl = Environment.GetEnvironmentVariable("ENTITLEMENT_API_BASE_URL") ?? "http://127.0.0.1:3000";
var productCode = Environment.GetEnvironmentVariable("ENTITLEMENT_PRODUCT_CODE") ?? "demo_app";
var licenseKey = Environment.GetEnvironmentVariable("ENTITLEMENT_LICENSE_KEY") ?? "LIC-DEMO";

using var http = new HttpClient { BaseAddress = new Uri(apiBaseUrl) };
var client = new LicenseClient(http, productCode);
var device = new DeviceInfo(
    DeviceCode: Environment.MachineName,
    Fingerprint: Environment.MachineName,
    DeviceName: Environment.MachineName,
    OsType: Environment.OSVersion.Platform.ToString(),
    OsVersion: Environment.OSVersion.VersionString,
    AppVersion: "1.0.0");

var activated = await client.ActivateAsync(licenseKey, device);
Console.WriteLine($"activate: {activated.LeaseToken}");

if (!string.IsNullOrWhiteSpace(activated.LeaseToken))
{
    var verified = await client.VerifyAsync(activated.LeaseToken, device.DeviceCode, device.AppVersion);
    Console.WriteLine($"verify: {verified.LeaseExpireAt}");

    var heartbeat = await client.HeartbeatAsync(activated.LeaseToken, device.DeviceCode, device.AppVersion);
    Console.WriteLine($"heartbeat: {heartbeat.LeaseExpireAt}");

    await client.DeactivateAsync(licenseKey, device.DeviceCode);
    Console.WriteLine("deactivate: OK");
}
