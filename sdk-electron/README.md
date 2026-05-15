# Electron SDK

## Install

当前阶段使用仓库本地包：

```bash
npm install ../sdk-electron
```

正式交付阶段建议通过 GitHub Release artifact、npm tarball 或私有 npm registry 发布。

## Configure

```ts
import { LicenseClient } from '@entitlement/sdk-electron';

const client = new LicenseClient({
  apiBaseUrl: 'http://127.0.0.1:3000',
  productCode: 'demo_app',
  appVersion: '1.0.0',
  requestSigningSecret: process.env.LICENSE_REQUEST_SIGNING_SECRET,
});
```

## Runtime Flow

```ts
await client.activate('DEMO-AAAA-BBBB-CCCC');
const state = await client.verifyOnStartup();
client.startHeartbeat();
```

退出或换机时：

```ts
await client.deactivate('DEMO-AAAA-BBBB-CCCC');
```

## Error Model

SDK 抛出 `LicenseSdkError`，其中 `code` 与服务端错误码保持一致，例如：

- `NETWORK_ERROR`
- `UNAUTHORIZED`
- `LICENSE_BANNED`
- `LICENSE_EXPIRED`
- `DEVICE_LIMIT_REACHED`
- `LEASE_EXPIRED`
- `FORCE_UPGRADE_REQUIRED`

客户端应按 `code` 分支处理，不应只依赖错误文本。
