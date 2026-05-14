# 通用授权系统-数据库与 API 设计

## 1. 目标

本文档定义通用在线授权系统的核心数据库模型与 API 设计，目标是支撑：

- 多产品
- 多套餐
- 多 License
- 多设备
- 在线激活
- 在线验证
- 心跳续租
- 功能位控制
- 审计与封禁

---

## 2. 数据库设计原则

- 长期授权与短期使用分离
- 产品、套餐、License、设备解耦
- 所有关键状态变化可审计
- 优先支持在线授权主流程

---

## 3. 核心实体关系

```
Product
  └─ Plan
       └─ License
            ├─ Device
            ├─ Lease
            ├─ ActivationLog
            └─ AuditLog
```

---

## 4. 表结构设计

## 4.1 products

用途：定义接入的产品。

字段建议：

- `id` bigint pk
- `product_code` varchar(64) unique
- `name` varchar(128)
- `status` varchar(32)
- `description` text
- `created_at` timestamp
- `updated_at` timestamp

索引：

- `uk_products_product_code`

---

## 4.2 plans

用途：定义某产品下的套餐。

字段建议：

- `id` bigint pk
- `product_id` bigint
- `plan_code` varchar(64)
- `name` varchar(128)
- `status` varchar(32)
- `duration_days` int
- `max_devices` int
- `max_concurrency` int
- `grace_hours` int
- `feature_flags` jsonb
- `created_at` timestamp
- `updated_at` timestamp

索引：

- `(product_id, plan_code)` unique

---

## 4.3 licenses

用途：定义具体授权。

字段建议：

- `id` bigint pk
- `license_key` varchar(128) unique
- `product_id` bigint
- `plan_id` bigint
- `status` varchar(32)
- `customer_id` bigint null
- `channel_id` bigint null
- `issued_at` timestamp
- `activate_at` timestamp null
- `expire_at` timestamp null
- `max_devices_override` int null
- `max_concurrency_override` int null
- `feature_flags_override` jsonb null
- `notes` text null
- `created_at` timestamp
- `updated_at` timestamp

状态建议：

- `active`
- `inactive`
- `expired`
- `banned`
- `suspended`

索引：

- `uk_licenses_license_key`
- `idx_licenses_product_status`

---

## 4.4 devices

用途：记录激活设备。

字段建议：

- `id` bigint pk
- `license_id` bigint
- `device_code` varchar(64) unique
- `fingerprint_hash` varchar(128)
- `device_name` varchar(128)
- `os_type` varchar(32)
- `os_version` varchar(64)
- `app_version` varchar(64)
- `hardware_summary` jsonb
- `status` varchar(32)
- `first_activate_at` timestamp
- `last_seen_at` timestamp
- `last_ip` varchar(64) null
- `unbind_count` int default 0
- `created_at` timestamp
- `updated_at` timestamp

状态建议：

- `active`
- `removed`
- `banned`

索引：

- `uk_devices_device_code`
- `idx_devices_license_status`
- `idx_devices_last_seen_at`

---

## 4.5 leases

用途：短期授权租约。

字段建议：

- `id` bigint pk
- `license_id` bigint
- `device_id` bigint
- `lease_token_id` varchar(64) unique
- `issued_at` timestamp
- `expire_at` timestamp
- `nonce` varchar(64)
- `status` varchar(32)
- `client_version` varchar(64)
- `signature` text
- `created_at` timestamp
- `updated_at` timestamp

状态建议：

- `active`
- `expired`
- `revoked`

索引：

- `uk_leases_lease_token_id`
- `idx_leases_license_device`
- `idx_leases_expire_at`

---

## 4.6 activation_logs

用途：记录激活行为。

字段建议：

- `id` bigint pk
- `license_id` bigint
- `device_id` bigint null
- `result_code` varchar(64)
- `message` varchar(255)
- `ip` varchar(64)
- `user_agent` varchar(255) null
- `request_payload` jsonb
- `created_at` timestamp

索引：

- `idx_activation_logs_license_created`
- `idx_activation_logs_result_code`

---

## 4.7 heartbeat_logs

用途：记录验证和心跳行为。

字段建议：

- `id` bigint pk
- `license_id` bigint
- `device_id` bigint
- `lease_id` bigint null
- `action_type` varchar(32)
- `result_code` varchar(64)
- `ip` varchar(64)
- `payload` jsonb
- `created_at` timestamp

索引：

- `idx_heartbeat_logs_license_created`
- `idx_heartbeat_logs_device_created`

---

## 4.8 audit_logs

用途：记录后台高危操作。

字段建议：

- `id` bigint pk
- `actor_type` varchar(32)
- `actor_id` bigint
- `target_type` varchar(32)
- `target_id` bigint
- `action` varchar(64)
- `before_data` jsonb null
- `after_data` jsonb null
- `ip` varchar(64) null
- `created_at` timestamp

索引：

- `idx_audit_logs_actor`
- `idx_audit_logs_target`

---

## 4.9 version_policies

用途：控制版本升级策略。

字段建议：

- `id` bigint pk
- `product_id` bigint
- `min_supported_version` varchar(64)
- `latest_version` varchar(64)
- `force_upgrade` boolean
- `download_url` text null
- `notice` text null
- `created_at` timestamp
- `updated_at` timestamp

---

## 4.10 admins

用途：后台管理员。

字段建议：

- `id` bigint pk
- `username` varchar(64) unique
- `password_hash` varchar(255)
- `role_code` varchar(64)
- `status` varchar(32)
- `created_at` timestamp
- `updated_at` timestamp

---

## 5. 关键数据规则

## 5.1 License 有效设备数计算

计算规则：

- 统计 `devices.status = active`
- 对比 `plans.max_devices` 或 `licenses.max_devices_override`

## 5.2 Feature Flags 计算

优先级建议：

1. `licenses.feature_flags_override`
2. `plans.feature_flags`

## 5.3 宽限期计算

优先使用：

- `plan.grace_hours`

客户端在 Lease 过期后，可在宽限期内继续运行，但必须尽快联网续租。

---

## 6. API 设计原则

- REST 风格
- 公共授权 API 与管理 API 分离
- 所有响应使用统一结构

响应结构建议：

```json
{
  "code": "OK",
  "message": "success",
  "data": {}
}
```

错误结构示例：

```json
{
  "code": "LICENSE_EXPIRED",
  "message": "license expired",
  "data": null
}
```

---

## 7. 公共授权 API

## 7.1 POST /api/v1/license/activate

### 用途

首次激活或重新激活。

### 请求参数

```json
{
  "productCode": "demo_app",
  "licenseKey": "XXXX-XXXX-XXXX",
  "device": {
    "deviceCode": "dev_xxx",
    "fingerprintHash": "hash_xxx",
    "deviceName": "DESKTOP-001",
    "osType": "windows",
    "osVersion": "11",
    "appVersion": "1.0.0",
    "hardwareSummary": {}
  }
}
```

### 成功响应

```json
{
  "code": "OK",
  "message": "activated",
  "data": {
    "licenseStatus": "active",
    "deviceId": 1,
    "leaseToken": "token_xxx",
    "leaseExpireAt": "2026-05-01T12:00:00Z",
    "featureFlags": {
      "publish": true,
      "maxWindowCount": 20
    },
    "versionPolicy": {
      "forceUpgrade": false,
      "latestVersion": "1.0.1"
    }
  }
}
```

### 常见错误码

- `LICENSE_NOT_FOUND`
- `LICENSE_EXPIRED`
- `LICENSE_BANNED`
- `DEVICE_LIMIT_REACHED`
- `PRODUCT_MISMATCH`

---

## 7.2 POST /api/v1/license/verify

### 用途

启动时校验本地 Lease 是否仍有效，并决定是否需要续租。

### 请求参数

```json
{
  "productCode": "demo_app",
  "leaseToken": "token_xxx",
  "deviceCode": "dev_xxx",
  "appVersion": "1.0.0"
}
```

### 成功响应

```json
{
  "code": "OK",
  "message": "valid",
  "data": {
    "licenseStatus": "active",
    "needRefresh": true,
    "featureFlags": {
      "publish": true
    },
    "versionPolicy": {
      "forceUpgrade": false
    }
  }
}
```

### 错误码

- `LEASE_INVALID`
- `LEASE_EXPIRED`
- `LICENSE_BANNED`
- `DEVICE_REMOVED`
- `FORCE_UPGRADE_REQUIRED`

---

## 7.3 POST /api/v1/license/heartbeat

### 用途

运行中续租与同步策略。

### 请求参数

```json
{
  "productCode": "demo_app",
  "leaseToken": "token_xxx",
  "deviceCode": "dev_xxx",
  "appVersion": "1.0.0",
  "runtime": {
    "sessionId": "sess_xxx"
  }
}
```

### 响应

```json
{
  "code": "OK",
  "message": "refreshed",
  "data": {
    "leaseToken": "token_new_xxx",
    "leaseExpireAt": "2026-05-01T14:00:00Z",
    "featureFlags": {
      "publish": true
    },
    "versionPolicy": {
      "forceUpgrade": false
    }
  }
}
```

---

## 7.4 POST /api/v1/license/deactivate

### 用途

客户端主动解绑设备。

### 请求参数

```json
{
  "productCode": "demo_app",
  "licenseKey": "XXXX-XXXX-XXXX",
  "deviceCode": "dev_xxx"
}
```

### 响应

```json
{
  "code": "OK",
  "message": "device removed",
  "data": null
}
```

---

## 7.5 GET /api/v1/license/info

### 用途

查询当前授权信息。

### 请求参数

- `productCode`
- `leaseToken`

### 响应

返回：

- License 状态
- 到期时间
- 当前套餐
- 功能位
- 设备信息

---

## 7.6 GET /api/v1/version/policy

### 用途

客户端获取版本策略。

### 响应字段

- `minSupportedVersion`
- `latestVersion`
- `forceUpgrade`
- `downloadUrl`
- `notice`

---

## 8. 后台管理 API

## 8.1 产品管理

- `POST /admin/products`
- `GET /admin/products`
- `PUT /admin/products/:id`

## 8.2 套餐管理

- `POST /admin/plans`
- `GET /admin/plans`
- `PUT /admin/plans/:id`

## 8.3 License 管理

- `POST /admin/licenses`
- `POST /admin/licenses/batch-generate`
- `GET /admin/licenses`
- `GET /admin/licenses/:id`
- `PUT /admin/licenses/:id/status`
- `PUT /admin/licenses/:id/feature-flags`

## 8.4 设备管理

- `GET /admin/licenses/:id/devices`
- `POST /admin/devices/:id/remove`
- `POST /admin/devices/:id/ban`

## 8.5 日志审计

- `GET /admin/audit-logs`
- `GET /admin/activation-logs`
- `GET /admin/heartbeat-logs`

---

## 9. 错误码设计

建议统一错误码：

- `OK`
- `BAD_REQUEST`
- `UNAUTHORIZED`
- `INTERNAL_ERROR`
- `LICENSE_NOT_FOUND`
- `LICENSE_INACTIVE`
- `LICENSE_EXPIRED`
- `LICENSE_BANNED`
- `PRODUCT_MISMATCH`
- `PLAN_INVALID`
- `DEVICE_LIMIT_REACHED`
- `DEVICE_REMOVED`
- `LEASE_INVALID`
- `LEASE_EXPIRED`
- `FORCE_UPGRADE_REQUIRED`
- `SIGNATURE_INVALID`
- `REQUEST_EXPIRED`
- `NONCE_REPLAY`

---

## 10. 安全机制建议

## 10.1 请求头

建议所有公共授权 API 请求带：

- `X-Product-Code`
- `X-Timestamp`
- `X-Nonce`
- `X-Signature`
- `X-SDK-Version`

## 10.2 签名策略

建议签名输入：

- 方法
- 路径
- 时间戳
- nonce
- 请求体摘要

## 10.3 重放保护

- 校验时间窗口
- 缓存近期 nonce

---

## 11. 示例查询

## 11.1 查询某授权当前活跃设备数

```sql
select count(*)
from devices
where license_id = ?
  and status = 'active';
```

## 11.2 查询即将到期授权

```sql
select *
from licenses
where status = 'active'
  and expire_at is not null
  and expire_at < now() + interval '7 day';
```

## 11.3 查询异常高频激活

```sql
select license_id, count(*) as cnt
from activation_logs
where created_at > now() - interval '1 day'
group by license_id
having count(*) > 10;
```

---

## 12. 迁移与演进建议

### MVP 阶段

- 先用单库单服务
- 优先跑通核心授权链路

### 后续演进

- 审计日志可拆独立存储
- 风控规则可拆独立服务
- 后台权限模型可升级为更细 RBAC

---

## 13. 结论

本设计的核心是：

- 数据层把长期授权和短期租约分开
- API 层把激活、验证、心跳分开
- 服务端掌握最终控制权
- 客户端只持有短期可撤销票据

这样既适合多个程序复用，也便于后续叠加功能位、渠道、离线授权和保护适配器。

