# 上线验收报告

## 验收范围

- Server 授权 API
- Admin UI 产品、套餐、License、设备、日志、版本策略管理
- Electron SDK 与 Demo
- License UI
- C++ SDK Demo
- .NET SDK Demo
- 请求签名、nonce 防重放、本地缓存加密、强制升级
- P2 风控面板、渠道/代理商、卡密、离线授权包、自助解绑、多租户、保护器适配器

## 验收命令

```bash
npm --prefix server run lint
npm --prefix server run test
npm --prefix server run test:e2e
npm --prefix server run build
npm --prefix admin run lint
npm --prefix admin run test
npm --prefix admin run build
npm --prefix license-ui run lint
npm --prefix license-ui run test
npm --prefix license-ui run build
npm --prefix sdk-electron run lint
npm --prefix sdk-electron run test
npm --prefix sdk-electron run build
npm --prefix demo-electron run lint
npm --prefix demo-electron run test
npm --prefix demo-electron run build
make -C sdk-cpp
# 如本机已安装 .NET SDK：dotnet build sdk-dotnet/demo/Entitlement.Sdk.Demo.csproj
```

## 业务链路验收

| 序号 | 场景 | 期望结果 | 状态 |
|---|---|---|---|
| 1 | 后台创建产品 | 产品列表出现新产品 | 自动化接口已覆盖 |
| 2 | 后台创建套餐 | 套餐列表出现新套餐 | 自动化接口已覆盖 |
| 3 | 后台创建 License | License 列表出现新授权码 | 自动化接口已覆盖 |
| 4 | Electron Demo 激活 | 客户端获得 leaseToken 与 feature flags | 构建/单测通过，GUI 待桌面验收 |
| 5 | Electron Demo 启动验证 | 授权状态为 active | 构建/单测通过，GUI 待桌面验收 |
| 6 | 心跳续租 | leaseToken 刷新，心跳日志写入 | 自动化 API 已通过 |
| 7 | 后台封禁 License | License 状态为 banned | 自动化 e2e 已覆盖 |
| 8 | 客户端再次验证 | 返回 `LICENSE_BANNED` | 自动化 e2e 已通过 |
| 9 | 第二台设备激活 | 返回 `DEVICE_LIMIT_REACHED` | 自动化 e2e 已通过 |
| 10 | 到期 License 验证 | 返回 `LICENSE_EXPIRED` | 单元测试已覆盖 |
| 11 | 强制升级策略 | 返回 `FORCE_UPGRADE_REQUIRED` | 自动化 e2e 已通过 |
| 12 | C++ Demo 接入 | activate / verify / heartbeat / deactivate 成功 | 临时数据库联调已通过 |
| 13 | 风控面板 | 可创建、查看、处理风险事件并统计风险摘要 | Admin UI build 通过，接口已编译 |
| 14 | 渠道/代理商管理 | 可创建渠道并启停渠道 | Admin UI build 通过，接口已编译 |
| 15 | 卡密管理 | 可生成卡密并维护发放/禁用状态 | Admin UI build 通过，接口已编译 |
| 16 | 离线授权包 | 可生成、撤销、恢复离线授权包 | Admin UI build 通过，接口已编译 |
| 17 | 自助设备解绑 | 客户端可提交申请，后台可通过/拒绝 | Admin UI build 通过，接口已编译 |
| 18 | 多租户 | 可创建租户，并关联产品、渠道、卡密、风险、适配器 | Prisma schema 校验通过 |
| 19 | .NET SDK | activate / verify / heartbeat / deactivate / version policy 客户端已提供 | 源码已完成，待 .NET SDK 环境构建 |
| 20 | 保护器适配器 | 可登记适配器并启停 | Admin UI build 通过，接口已编译 |

## 风险与限制

- Headless 环境无法实际打开 Electron GUI，需要在桌面环境补一次人工验收。
- 当前环境未安装 .NET SDK，`sdk-dotnet` 需要在具备 .NET 8 SDK 的环境补一次 `dotnet build`。
- 生产部署前必须轮换所有示例密钥和默认管理员密码。
- 如启用请求签名，所有客户端必须配置同一 `PUBLIC_API_SIGNING_SECRET`。
