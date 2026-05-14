-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('active', 'inactive', 'expired', 'banned', 'suspended');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('active', 'removed', 'banned');

-- CreateEnum
CREATE TYPE "LeaseStatus" AS ENUM ('active', 'expired', 'revoked');

-- CreateEnum
CREATE TYPE "AdminStatus" AS ENUM ('active', 'disabled');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('active', 'suspended');

-- CreateEnum
CREATE TYPE "ChannelStatus" AS ENUM ('active', 'disabled');

-- CreateEnum
CREATE TYPE "CardKeyStatus" AS ENUM ('unused', 'issued', 'redeemed', 'disabled');

-- CreateEnum
CREATE TYPE "OfflinePackageStatus" AS ENUM ('active', 'revoked');

-- CreateEnum
CREATE TYPE "RiskSeverity" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "RiskEventStatus" AS ENUM ('open', 'resolved', 'ignored');

-- CreateEnum
CREATE TYPE "DeviceUnbindStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "ProtectorAdapterStatus" AS ENUM ('active', 'inactive');

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER,
    "product_code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'active',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "plan_code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'active',
    "duration_days" INTEGER NOT NULL,
    "max_devices" INTEGER NOT NULL,
    "max_concurrency" INTEGER NOT NULL DEFAULT 1,
    "grace_hours" INTEGER NOT NULL DEFAULT 24,
    "feature_flags" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licenses" (
    "id" SERIAL NOT NULL,
    "license_key" VARCHAR(128) NOT NULL,
    "product_id" INTEGER NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "status" "LicenseStatus" NOT NULL DEFAULT 'active',
    "customer_id" INTEGER,
    "channel_id" INTEGER,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activate_at" TIMESTAMP(3),
    "expire_at" TIMESTAMP(3),
    "max_devices_override" INTEGER,
    "max_concurrency_override" INTEGER,
    "feature_flags_override" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" SERIAL NOT NULL,
    "license_id" INTEGER NOT NULL,
    "device_code" VARCHAR(64) NOT NULL,
    "fingerprint_hash" VARCHAR(128) NOT NULL,
    "device_name" VARCHAR(128) NOT NULL,
    "os_type" VARCHAR(32) NOT NULL,
    "os_version" VARCHAR(64) NOT NULL,
    "app_version" VARCHAR(64) NOT NULL,
    "hardware_summary" JSONB NOT NULL DEFAULT '{}',
    "status" "DeviceStatus" NOT NULL DEFAULT 'active',
    "first_activate_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_ip" VARCHAR(64),
    "unbind_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leases" (
    "id" SERIAL NOT NULL,
    "license_id" INTEGER NOT NULL,
    "device_id" INTEGER NOT NULL,
    "lease_token_id" VARCHAR(64) NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expire_at" TIMESTAMP(3) NOT NULL,
    "nonce" VARCHAR(64) NOT NULL,
    "status" "LeaseStatus" NOT NULL DEFAULT 'active',
    "client_version" VARCHAR(64) NOT NULL,
    "signature" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activation_logs" (
    "id" SERIAL NOT NULL,
    "license_id" INTEGER,
    "device_id" INTEGER,
    "result_code" VARCHAR(64) NOT NULL,
    "message" VARCHAR(255) NOT NULL,
    "ip" VARCHAR(64),
    "user_agent" VARCHAR(255),
    "request_payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "heartbeat_logs" (
    "id" SERIAL NOT NULL,
    "license_id" INTEGER,
    "device_id" INTEGER,
    "lease_id" INTEGER,
    "action_type" VARCHAR(32) NOT NULL,
    "result_code" VARCHAR(64) NOT NULL,
    "ip" VARCHAR(64),
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "heartbeat_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "actor_type" VARCHAR(32) NOT NULL,
    "actor_id" INTEGER,
    "target_type" VARCHAR(32) NOT NULL,
    "target_id" INTEGER,
    "action" VARCHAR(64) NOT NULL,
    "before_data" JSONB,
    "after_data" JSONB,
    "ip" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "version_policies" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "min_supported_version" VARCHAR(64) NOT NULL,
    "latest_version" VARCHAR(64) NOT NULL,
    "force_upgrade" BOOLEAN NOT NULL DEFAULT false,
    "download_url" TEXT,
    "notice" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "version_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" SERIAL NOT NULL,
    "tenant_code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'active',
    "contact_email" VARCHAR(128),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channels" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER,
    "channel_code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "status" "ChannelStatus" NOT NULL DEFAULT 'active',
    "contact" VARCHAR(128),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_keys" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER,
    "product_id" INTEGER NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "channel_id" INTEGER,
    "license_id" INTEGER,
    "card_key" VARCHAR(128) NOT NULL,
    "batch_code" VARCHAR(64),
    "status" "CardKeyStatus" NOT NULL DEFAULT 'unused',
    "expire_at" TIMESTAMP(3),
    "redeemed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "card_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offline_packages" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER,
    "license_id" INTEGER NOT NULL,
    "device_id" INTEGER,
    "package_code" VARCHAR(128) NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "signature" TEXT NOT NULL,
    "expire_at" TIMESTAMP(3) NOT NULL,
    "status" "OfflinePackageStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offline_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_events" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER,
    "license_id" INTEGER,
    "device_id" INTEGER,
    "event_type" VARCHAR(64) NOT NULL,
    "severity" "RiskSeverity" NOT NULL DEFAULT 'low',
    "status" "RiskEventStatus" NOT NULL DEFAULT 'open',
    "summary" VARCHAR(255) NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "count" INTEGER NOT NULL DEFAULT 1,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_unbind_requests" (
    "id" SERIAL NOT NULL,
    "license_id" INTEGER NOT NULL,
    "device_id" INTEGER NOT NULL,
    "reason" TEXT,
    "status" "DeviceUnbindStatus" NOT NULL DEFAULT 'pending',
    "handled_by" INTEGER,
    "handled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_unbind_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "protector_adapters" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER,
    "product_id" INTEGER,
    "adapter_code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "status" "ProtectorAdapterStatus" NOT NULL DEFAULT 'active',
    "config" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "protector_adapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(64) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "password_changed_at" TIMESTAMP(3),
    "role_code" VARCHAR(64) NOT NULL,
    "status" "AdminStatus" NOT NULL DEFAULT 'active',
    "tenant_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_product_code_key" ON "products"("product_code");

-- CreateIndex
CREATE UNIQUE INDEX "plans_product_id_plan_code_key" ON "plans"("product_id", "plan_code");

-- CreateIndex
CREATE UNIQUE INDEX "licenses_license_key_key" ON "licenses"("license_key");

-- CreateIndex
CREATE INDEX "licenses_product_id_status_idx" ON "licenses"("product_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "devices_device_code_key" ON "devices"("device_code");

-- CreateIndex
CREATE INDEX "devices_license_id_status_idx" ON "devices"("license_id", "status");

-- CreateIndex
CREATE INDEX "devices_last_seen_at_idx" ON "devices"("last_seen_at");

-- CreateIndex
CREATE UNIQUE INDEX "leases_lease_token_id_key" ON "leases"("lease_token_id");

-- CreateIndex
CREATE INDEX "leases_license_id_device_id_idx" ON "leases"("license_id", "device_id");

-- CreateIndex
CREATE INDEX "leases_expire_at_idx" ON "leases"("expire_at");

-- CreateIndex
CREATE INDEX "activation_logs_license_id_created_at_idx" ON "activation_logs"("license_id", "created_at");

-- CreateIndex
CREATE INDEX "activation_logs_result_code_idx" ON "activation_logs"("result_code");

-- CreateIndex
CREATE INDEX "heartbeat_logs_license_id_created_at_idx" ON "heartbeat_logs"("license_id", "created_at");

-- CreateIndex
CREATE INDEX "heartbeat_logs_device_id_created_at_idx" ON "heartbeat_logs"("device_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_type_actor_id_idx" ON "audit_logs"("actor_type", "actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_target_type_target_id_idx" ON "audit_logs"("target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_tenant_code_key" ON "tenants"("tenant_code");

-- CreateIndex
CREATE UNIQUE INDEX "channels_channel_code_key" ON "channels"("channel_code");

-- CreateIndex
CREATE UNIQUE INDEX "card_keys_card_key_key" ON "card_keys"("card_key");

-- CreateIndex
CREATE INDEX "card_keys_product_id_status_idx" ON "card_keys"("product_id", "status");

-- CreateIndex
CREATE INDEX "card_keys_batch_code_idx" ON "card_keys"("batch_code");

-- CreateIndex
CREATE UNIQUE INDEX "offline_packages_package_code_key" ON "offline_packages"("package_code");

-- CreateIndex
CREATE INDEX "offline_packages_license_id_status_idx" ON "offline_packages"("license_id", "status");

-- CreateIndex
CREATE INDEX "risk_events_severity_status_idx" ON "risk_events"("severity", "status");

-- CreateIndex
CREATE INDEX "risk_events_license_id_created_at_idx" ON "risk_events"("license_id", "created_at");

-- CreateIndex
CREATE INDEX "device_unbind_requests_status_created_at_idx" ON "device_unbind_requests"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "protector_adapters_adapter_code_key" ON "protector_adapters"("adapter_code");

-- CreateIndex
CREATE UNIQUE INDEX "admins_username_key" ON "admins"("username");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activation_logs" ADD CONSTRAINT "activation_logs_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activation_logs" ADD CONSTRAINT "activation_logs_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "heartbeat_logs" ADD CONSTRAINT "heartbeat_logs_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "heartbeat_logs" ADD CONSTRAINT "heartbeat_logs_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "heartbeat_logs" ADD CONSTRAINT "heartbeat_logs_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "version_policies" ADD CONSTRAINT "version_policies_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channels" ADD CONSTRAINT "channels_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_keys" ADD CONSTRAINT "card_keys_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_keys" ADD CONSTRAINT "card_keys_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_keys" ADD CONSTRAINT "card_keys_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_keys" ADD CONSTRAINT "card_keys_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_keys" ADD CONSTRAINT "card_keys_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offline_packages" ADD CONSTRAINT "offline_packages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offline_packages" ADD CONSTRAINT "offline_packages_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offline_packages" ADD CONSTRAINT "offline_packages_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_events" ADD CONSTRAINT "risk_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_events" ADD CONSTRAINT "risk_events_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_events" ADD CONSTRAINT "risk_events_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_unbind_requests" ADD CONSTRAINT "device_unbind_requests_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_unbind_requests" ADD CONSTRAINT "device_unbind_requests_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protector_adapters" ADD CONSTRAINT "protector_adapters_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protector_adapters" ADD CONSTRAINT "protector_adapters_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
