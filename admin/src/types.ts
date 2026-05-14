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
