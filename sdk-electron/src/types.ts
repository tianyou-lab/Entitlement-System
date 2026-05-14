export type ApiCode =
  | 'OK'
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'INTERNAL_ERROR'
  | 'LICENSE_NOT_FOUND'
  | 'LICENSE_INACTIVE'
  | 'LICENSE_EXPIRED'
  | 'LICENSE_BANNED'
  | 'PRODUCT_MISMATCH'
  | 'PLAN_INVALID'
  | 'DEVICE_LIMIT_REACHED'
  | 'DEVICE_REMOVED'
  | 'LEASE_INVALID'
  | 'LEASE_EXPIRED'
  | 'FORCE_UPGRADE_REQUIRED'
  | 'NETWORK_ERROR';

export interface ApiResponse<T> {
  code: ApiCode | string;
  message: string;
  data: T | null;
}

export interface DeviceInfo {
  deviceCode: string;
  fingerprintHash: string;
  deviceName: string;
  osType: string;
  osVersion: string;
  appVersion: string;
  hardwareSummary: Record<string, unknown>;
}

export interface VersionPolicy {
  minSupportedVersion?: string;
  latestVersion?: string;
  forceUpgrade: boolean;
  downloadUrl?: string | null;
  notice?: string | null;
}

export type FeatureFlags = Record<string, boolean | number | string | null>;

export interface ActivateResult {
  licenseStatus: string;
  deviceId: number;
  leaseToken: string;
  leaseExpireAt: string;
  featureFlags: FeatureFlags;
  versionPolicy: VersionPolicy;
}

export interface VerifyResult {
  licenseStatus: string;
  needRefresh: boolean;
  featureFlags: FeatureFlags;
  versionPolicy: VersionPolicy;
}

export interface HeartbeatResult {
  leaseToken: string;
  leaseExpireAt: string;
  featureFlags: FeatureFlags;
  versionPolicy: VersionPolicy;
}

export interface LicenseCache {
  leaseToken: string;
  leaseExpireAt: string;
  deviceCode: string;
  featureFlags: FeatureFlags;
  lastVerifiedAt: string;
  licenseStatus: string;
}

export interface LicenseSdkConfig {
  apiBaseUrl: string;
  productCode: string;
  appVersion: string;
  storagePath?: string;
  heartbeatIntervalMs?: number;
  graceHours?: number;
  device?: Partial<DeviceInfo>;
  fetchImpl?: typeof fetch;
  requestSigningSecret?: string;
}

export interface LicenseState {
  status: 'inactive' | 'active' | 'grace' | 'expired' | 'banned' | 'device-removed' | 'network-error' | 'invalid';
  code?: ApiCode | string;
  message?: string;
  featureFlags: FeatureFlags;
  leaseExpireAt?: string;
}

export class LicenseSdkError extends Error {
  constructor(
    public readonly code: ApiCode | string,
    message: string,
    public readonly data: unknown = null,
  ) {
    super(message);
    this.name = 'LicenseSdkError';
  }
}
