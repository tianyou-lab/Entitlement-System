# 运维说明

## 部署

1. 复制 `.env.production.example` 为 `.env.production`。
2. 为 `POSTGRES_PASSWORD`、`JWT_SECRET`、`LEASE_SECRET`、`PUBLIC_API_SIGNING_SECRET` 填入生产随机密钥。
3. 启动服务：

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

4. 初始化数据库 schema 与种子数据：

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec server npx prisma db push
docker compose --env-file .env.production -f docker-compose.prod.yml exec server npx prisma db seed
```

## 日常检查

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=200 server
```

## 安全配置

- 生产环境必须设置 `JWT_SECRET`、`LEASE_SECRET`、`PUBLIC_API_SIGNING_SECRET`。
- 启用 `PUBLIC_API_SIGNING_SECRET` 后，公共授权 API 要求客户端发送请求签名、时间戳和 nonce。
- 不要提交 `.env.production`、数据库备份或管理员凭据。
- 首次部署后请修改 seed 默认管理员密码，或删除默认管理员后重新创建。

## 备份

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec postgres pg_dump -U entitlement entitlement > entitlement-backup.sql
```

## 回滚

1. 保留旧镜像或旧代码 tag。
2. 停止服务。
3. 恢复旧镜像/代码并重新启动。
4. 如数据库 migration 已执行，先确认是否需要恢复备份。
