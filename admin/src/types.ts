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
  admin: AdminUser;
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
  licenseKey: string;
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

export interface CreateProductInput {
  productCode: string;
  name: string;
  description?: string;
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
