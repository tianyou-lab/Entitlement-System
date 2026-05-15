# .NET SDK

## Install

当前阶段直接引用源码项目：

```bash
dotnet add <your-app>.csproj reference ../sdk-dotnet/src/Entitlement.Sdk.csproj
```

正式交付阶段建议发布 NuGet 包或离线 `.nupkg`。

## Configure

```csharp
using Entitlement.Sdk;

var http = new HttpClient { BaseAddress = new Uri("http://127.0.0.1:3000") };
var client = new LicenseClient(
    http,
    "demo_app",
    Environment.GetEnvironmentVariable("ENTITLEMENT_REQUEST_SIGNING_SECRET"));
```

## Runtime Flow

```csharp
var activation = await client.ActivateAsync("DEMO-AAAA-BBBB-CCCC", device);
var verify = await client.VerifyAsync(activation.LeaseToken!, device.DeviceCode, device.AppVersion);
var heartbeat = await client.HeartbeatAsync(activation.LeaseToken!, device.DeviceCode, device.AppVersion);
await client.DeactivateAsync("DEMO-AAAA-BBBB-CCCC", device.DeviceCode);
```

## Error Model

SDK 抛出 `EntitlementException`，其中 `Code` 与服务端错误码保持一致，例如：

- `UNAUTHORIZED`
- `LICENSE_BANNED`
- `LICENSE_EXPIRED`
- `DEVICE_LIMIT_REACHED`
- `LEASE_EXPIRED`
- `FORCE_UPGRADE_REQUIRED`

客户端应按 `Code` 分支处理，不应只依赖异常文本。
