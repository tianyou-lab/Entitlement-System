# Entitlement System

通用软件授权与卡密运营系统，适用于 Electron、C++、.NET 等桌面客户端的在线授权、设备绑定、心跳续租、版本策略、风控审计、渠道卡密和离线授权场景。

## 功能概览

- 授权产品、套餐、License、卡密、渠道和租户管理。
- 在线激活、验证、心跳续租、解绑和授权信息查询。
- 设备绑定、设备封禁、License 封禁、强制升级和功能开关。
- 激活日志、心跳日志、管理员审计日志和风险事件。
- 离线授权包、自助解绑申请和保护器适配器登记。
- 公共 API 支持 HMAC 请求签名和 nonce 防重放。
- 管理员后台支持 SDK 下载入口和接入文档。
- SDK/Demo：Electron TypeScript、C++ Demo、.NET 8 SDK、License UI。

## 工程结构

| 目录 | 说明 |
|---|---|
| `server/` | NestJS + Prisma 后端服务 |
| `admin/` | Vue 3 + Element Plus 管理后台 |
| `license-ui/` | 可嵌入授权激活 UI |
| `sdk-electron/` | Electron/TypeScript SDK |
| `sdk-cpp/` | C++ SDK Demo |
| `sdk-dotnet/` | .NET SDK 与 Demo |
| `demo-electron/` | Electron 桌面接入示例 |
| `docker-compose.prod.yml` | 生产部署编排 |

## 快速启动

安装依赖：

```bash
npm --prefix server install
npm --prefix admin install
npm --prefix license-ui install
npm --prefix sdk-electron install
npm --prefix demo-electron install
```

配置开发环境变量：

```bash
export DATABASE_URL=postgresql://entitlement:entitlement@127.0.0.1:5432/entitlement?schema=public
export JWT_SECRET=dev-jwt-secret
export LEASE_SECRET=dev-lease-secret
export LICENSE_KEY_HASH_SECRET=dev-license-key-hash-secret-change-in-production
export PUBLIC_API_SIGNING_SECRET=dev-public-api-signing-secret
export LEASE_TTL_MINUTES=120
```

初始化数据库：

```bash
npm --prefix server exec -- prisma generate --schema server/prisma/schema.prisma
npm --prefix server exec -- prisma migrate dev --schema server/prisma/schema.prisma
npm --prefix server exec -- prisma db seed --schema server/prisma/schema.prisma
```

启动服务：

```bash
npm --prefix server run start:dev
npm --prefix admin run dev
```

默认开发数据：

| 类型 | 值 |
|---|---|
| 管理员账号 | `admin` |
| 开发默认密码 | `admin123456`，首次登录后必须修改 |
| 产品编码 | `demo_app` |
| Demo License | `DEMO-AAAA-BBBB-CCCC` |

## 生产部署

复制并填写生产环境变量：

```bash
cp .env.production.example .env.production
```

启动：

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

初始化数据库：

```bash
scripts/prod-migrate.sh
docker compose --env-file .env.production -f docker-compose.prod.yml exec server npx prisma db seed
```

生产环境使用 Prisma migration，迁移文件位于 `server/prisma/migrations/`。不要在生产环境直接使用 `db push`。

生产环境必须使用高强度随机 `POSTGRES_PASSWORD`、`ADMIN_PASSWORD`、`JWT_SECRET`、`LEASE_SECRET`、`LICENSE_KEY_HASH_SECRET` 和 `PUBLIC_API_SIGNING_SECRET`。离线授权必须配置 Ed25519 `OFFLINE_LICENSE_PRIVATE_KEY` / `OFFLINE_LICENSE_PUBLIC_KEY`，请求签名密钥可通过 `PUBLIC_API_SIGNING_SECRETS` 按产品和版本轮换。

常用生产辅助脚本：

```bash
scripts/prod-migrate.sh
scripts/prod-backup.sh
scripts/prod-healthcheck.sh
scripts/prod-metrics.sh
```

服务健康检查入口：

```bash
curl http://127.0.0.1:3000/health
```

后台监控快照入口：

```bash
curl -H "Authorization: Bearer <admin-token>" http://127.0.0.1:3000/admin/monitoring/metrics
```

## SDK 接入

管理员后台左侧进入 `SDK 接入` 可查看 SDK 下载入口和接入步骤。

SDK 最小接入文档：

- [Electron SDK](./sdk-electron/README.md)
- [.NET SDK](./sdk-dotnet/README.md)
- [C++ SDK Demo](./sdk-cpp/README.md)

常用构建命令：

```bash
npm --prefix sdk-electron run build
make -C sdk-cpp clean all
dotnet build sdk-dotnet/demo/Entitlement.Sdk.Demo.csproj
```

C++ Demo 如连接启用了公共 API 请求签名的服务端，需先设置：

```bash
export ENTITLEMENT_REQUEST_SIGNING_SECRET=dev-public-api-signing-secret
```

.NET Demo 运行示例：

```bash
export ENTITLEMENT_API_BASE_URL=http://127.0.0.1:3000
export ENTITLEMENT_PRODUCT_CODE=demo_app
export ENTITLEMENT_LICENSE_KEY=DEMO-AAAA-BBBB-CCCC
export ENTITLEMENT_REQUEST_SIGNING_SECRET=dev-public-api-signing-secret
dotnet run --project sdk-dotnet/demo/Entitlement.Sdk.Demo.csproj
```

## 验证命令

```bash
npm --prefix server run lint
npm --prefix server exec -- prisma validate --schema server/prisma/schema.prisma
npm --prefix server exec -- prisma migrate diff --from-empty --to-schema-datamodel server/prisma/schema.prisma --script --output /tmp/entitlement-schema.sql
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
make -C sdk-cpp clean all
```

## 文档

- [已完成开发文档](./01-已完成开发文档.md)
- [待开发计划文档](./02-待开发计划文档.md)
- [使用部署说明](./03-使用部署说明.md)
- [A 阶段验收清单](./04-A阶段验收清单.md)
- [数据库迁移与回滚规范](./05-数据库迁移与回滚规范.md)
- [生产限流评估](./06-生产限流评估.md)

## 安全提醒

- 不要提交 `.env.production`、数据库备份、管理员凭据或生产密钥。
- 生产环境必须开启 HTTPS。
- 首次部署后必须修改默认管理员密码。
- 如启用 `PUBLIC_API_SIGNING_SECRET`，所有客户端请求必须按约定签名。
