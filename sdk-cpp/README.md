# C++ SDK Demo

## Build

需要 GNU Make、g++ 和 OpenSSL libcrypto 开发库。

```bash
make -C sdk-cpp clean all
```

## Configure

如服务端启用了公共 API 请求签名：

```bash
export ENTITLEMENT_REQUEST_SIGNING_SECRET=dev-public-api-signing-secret
```

也兼容读取 `LICENSE_REQUEST_SIGNING_SECRET`。

## Runtime Flow

```bash
./sdk-cpp/build/demo http://127.0.0.1:3000 DEMO-AAAA-BBBB-CCCC
```

Demo 会依次执行：

1. activate
2. verify
3. heartbeat
4. deactivate

## Error Model

`LicenseResponse` 暴露以下字段：

- `ok`
- `httpStatus`
- `code`
- `message`
- `body`
- `leaseToken`

`code` 与服务端错误码保持一致，例如 `UNAUTHORIZED`、`LICENSE_BANNED`、`DEVICE_LIMIT_REACHED`、`LEASE_EXPIRED`、`FORCE_UPGRADE_REQUIRED`。客户端应按 `code` 分支处理。
