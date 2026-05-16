export interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

export interface AdminUser {
  id: number;
  username: string;
  roleCode: string;
}

export interface LoginResult {
  accessToken: string;
  passwordChangeRequired: boolean;
  admin: AdminUser;
}

export interface AdminAccount {
  id: number;
  username: string;
  roleCode: 'super_admin' | 'operator' | 'viewer';
  status: 'active' | 'disabled';
  tenantId?: number;
  tenant?: Tenant;
  createdAt: string;
}

export interface Product {
  id: number;
  productCode: string;
  name: string;
  status: 'active' | 'inactive';
  description?: string;
}

export interface Plan {
  id: number;
  productId: number;
  planCode: string;
  name: string;
  status: 'active' | 'inactive';
  durationDays: number;
  maxDevices: number;
  maxConcurrency: number;
  graceHours: number;
  featureFlags: Record<string, unknown>;
  product?: Product;
}

export interface License {
  id: number;
  licenseKey?: string;
  productId: number;
  planId: number;
  status: 'active' | 'inactive' | 'expired' | 'banned' | 'suspended';
  expireAt?: string;
  maxDevicesOverride?: number;
  featureFlagsOverride?: Record<string, unknown>;
  notes?: string;
  product?: Product;
  plan?: Plan;
}

export interface Device {
  id: number;
  licenseId: number;
  deviceCode: string;
  deviceName: string;
  osType: string;
  osVersion: string;
  appVersion: string;
  status: 'active' | 'removed' | 'banned';
  lastSeenAt: string;
  lastIp?: string;
  license?: License;
}

export interface ActivationLog {
  id: number;
  resultCode: string;
  message: string;
  ip?: string;
  createdAt: string;
  license?: License;
  device?: Device;
}

export interface HeartbeatLog {
  id: number;
  actionType: string;
  resultCode: string;
  ip?: string;
  createdAt: string;
  license?: License;
  device?: Device;
}

export interface AuditLog {
  id: number;
  actorType: string;
  actorId?: number;
  targetType: string;
  targetId?: number;
  action: string;
  createdAt: string;
}

export interface VersionPolicy {
  id: number;
  productId: number;
  minSupportedVersion: string;
  latestVersion: string;
  forceUpgrade: boolean;
  downloadUrl?: string;
  notice?: string;
  product?: Product;
}

export interface Tenant {
  id: number;
  tenantCode: string;
  name: string;
  status: 'active' | 'suspended';
  contactEmail?: string;
}

export interface Channel {
  id: number;
  tenantId?: number;
  channelCode: string;
  name: string;
  status: 'active' | 'disabled';
  contact?: string;
  notes?: string;
  tenant?: Tenant;
}

export interface CardKey {
  id: number;
  tenantId?: number;
  productId: number;
  planId: number;
  channelId?: number;
  licenseId?: number;
  cardKey: string;
  batchCode?: string;
  status: 'unused' | 'issued' | 'redeemed' | 'disabled';
  expireAt?: string;
  product?: Product;
  plan?: Plan;
  channel?: Channel;
  license?: License;
}

export interface OfflinePackage {
  id: number;
  tenantId?: number;
  licenseId: number;
  deviceId?: number;
  packageCode: string;
  signature: string;
  expireAt: string;
  status: 'active' | 'revoked';
  license?: License;
  device?: Device;
}

export interface RiskEvent {
  id: number;
  tenantId?: number;
  licenseId?: number;
  deviceId?: number;
  eventType: string;
  severity: 'low' | 'medium' | 'high';
  status: 'open' | 'resolved' | 'ignored';
  summary: string;
  count: number;
  createdAt: string;
  license?: License;
  device?: Device;
}

export interface RiskSummary {
  total: number;
  open: number;
  high: number;
  resolved: number;
}

export interface RouteMetric {
  route: string;
  count: number;
  failures: number;
  failureRate: number;
  averageLatencyMs: number;
  maxLatencyMs: number;
}

export interface MonitoringMetrics {
  api: {
    startedAt: string;
    uptimeSeconds: number;
    requests: {
      total: number;
      failures: number;
      failureRate: number;
      averageLatencyMs: number;
      maxLatencyMs: number;
    };
    errorCodes: Record<string, number>;
    routes: RouteMetric[];
  };
  postgres: {
    connections: number | null;
    databaseSizeBytes: number | null;
  };
}

export interface DeviceUnbindRequest {
  id: number;
  licenseId: number;
  deviceId: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  license?: License;
  device?: Device;
}

export interface ProtectorAdapter {
  id: number;
  tenantId?: number;
  productId?: number;
  adapterCode: string;
  name: string;
  status: 'active' | 'inactive';
  notes?: string;
  tenant?: Tenant;
  product?: Product;
}

export interface CreateProductInput {
  productCode: string;
  name: string;
  description?: string;
}

export interface UpdateProductInput {
  name?: string;
  status?: Product['status'];
  description?: string;
}

export interface CreateAdminInput {
  username: string;
  password: string;
  roleCode: AdminAccount['roleCode'];
  tenantId?: number;
}

export interface CreatePlanInput {
  productId: number;
  planCode: string;
  name: string;
  durationDays: number;
  maxDevices: number;
  maxConcurrency?: number;
  graceHours?: number;
  featureFlags?: Record<string, unknown>;
}

export interface CreateLicenseInput {
  productId: number;
  planId: number;
  licenseKey?: string;
  expireAt?: string;
  maxDevicesOverride?: number;
  featureFlagsOverride?: Record<string, unknown>;
  notes?: string;
}

export interface CreateVersionPolicyInput {
  productId: number;
  minSupportedVersion: string;
  latestVersion: string;
  forceUpgrade?: boolean;
  downloadUrl?: string;
  notice?: string;
}

export interface CreateTenantInput {
  tenantCode: string;
  name: string;
  contactEmail?: string;
}

export interface CreateChannelInput {
  tenantId?: number;
  channelCode: string;
  name: string;
  contact?: string;
  notes?: string;
}

export interface CreateCardKeyInput {
  tenantId?: number;
  productId: number;
  planId?: number;
  durationType?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  durationHours?: number;
  channelId?: number;
  cardKey?: string;
  batchCode?: string;
}

export interface CreateOfflinePackageInput {
  tenantId?: number;
  licenseId: number;
  deviceId?: number;
  packageCode?: string;
  expireAt: string;
}

export interface CreateRiskEventInput {
  tenantId?: number;
  licenseId?: number;
  deviceId?: number;
  eventType: string;
  severity?: RiskEvent['severity'];
  summary: string;
}

export interface CreateDeviceUnbindRequestInput {
  licenseId: number;
  deviceId: number;
  reason?: string;
}

export interface CreateProtectorAdapterInput {
  tenantId?: number;
  productId?: number;
  adapterCode: string;
  name: string;
  notes?: string;
}
