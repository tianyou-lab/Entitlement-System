import type { ActivationLog, ApiResponse, AuditLog, CardKey, Channel, CreateCardKeyInput, CreateChannelInput, CreateDeviceUnbindRequestInput, CreateLicenseInput, CreateOfflinePackageInput, CreatePlanInput, CreateProductInput, CreateProtectorAdapterInput, CreateRiskEventInput, CreateTenantInput, CreateVersionPolicyInput, Device, DeviceUnbindRequest, HeartbeatLog, License, LoginResult, OfflinePackage, Plan, Product, ProtectorAdapter, RiskEvent, RiskSummary, Tenant, VersionPolicy } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const TOKEN_KEY = 'entitlement_admin_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function login(username: string, password: string) {
  const result = await request<LoginResult>('/admin/auth/login', { method: 'POST', body: { username, password }, auth: false });
  setToken(result.accessToken);
  return result;
}

export function changePassword(oldPassword: string, newPassword: string) {
  return request<{ changed: boolean }>('/admin/auth/change-password', { method: 'POST', body: { oldPassword, newPassword } });
}

export function listProducts() {
  return request<Product[]>('/admin/products');
}

export function createProduct(input: CreateProductInput) {
  return request<Product>('/admin/products', { method: 'POST', body: input });
}

export function listPlans() {
  return request<Plan[]>('/admin/plans');
}

export function createPlan(input: CreatePlanInput) {
  return request<Plan>('/admin/plans', { method: 'POST', body: input });
}

export function listLicenses() {
  return request<License[]>('/admin/licenses');
}

export function createLicense(input: CreateLicenseInput) {
  return request<License>('/admin/licenses', { method: 'POST', body: input });
}

export function updateLicenseStatus(id: number, status: License['status']) {
  return request<License>(`/admin/licenses/${id}/status`, { method: 'PUT', body: { status } });
}

export function listDevices() {
  return request<Device[]>('/admin/devices');
}

export function updateDeviceStatus(id: number, status: Device['status']) {
  return request<Device>(`/admin/devices/${id}/status`, { method: 'PUT', body: { status } });
}

export function listActivationLogs() {
  return request<ActivationLog[]>('/admin/activation-logs');
}

export function listHeartbeatLogs() {
  return request<HeartbeatLog[]>('/admin/heartbeat-logs');
}

export function listAuditLogs() {
  return request<AuditLog[]>('/admin/audit-logs');
}

export function listVersionPolicies() {
  return request<VersionPolicy[]>('/admin/version-policies');
}

export function createVersionPolicy(input: CreateVersionPolicyInput) {
  return request<VersionPolicy>('/admin/version-policies', { method: 'POST', body: input });
}

export function updateVersionPolicy(id: number, input: Partial<CreateVersionPolicyInput>) {
  return request<VersionPolicy>(`/admin/version-policies/${id}`, { method: 'PUT', body: input });
}

export function listTenants() {
  return request<Tenant[]>('/admin/tenants');
}

export function createTenant(input: CreateTenantInput) {
  return request<Tenant>('/admin/tenants', { method: 'POST', body: input });
}

export function listChannels() {
  return request<Channel[]>('/admin/channels');
}

export function createChannel(input: CreateChannelInput) {
  return request<Channel>('/admin/channels', { method: 'POST', body: input });
}

export function updateChannelStatus(id: number, status: Channel['status']) {
  return request<Channel>(`/admin/channels/${id}/status`, { method: 'PUT', body: { status } });
}

export function listCardKeys() {
  return request<CardKey[]>('/admin/card-keys');
}

export function createCardKey(input: CreateCardKeyInput) {
  return request<CardKey>('/admin/card-keys', { method: 'POST', body: input });
}

export function updateCardKeyStatus(id: number, status: CardKey['status']) {
  return request<CardKey>(`/admin/card-keys/${id}/status`, { method: 'PUT', body: { status } });
}

export function listOfflinePackages() {
  return request<OfflinePackage[]>('/admin/offline-packages');
}

export function createOfflinePackage(input: CreateOfflinePackageInput) {
  return request<OfflinePackage>('/admin/offline-packages', { method: 'POST', body: input });
}

export function updateOfflinePackageStatus(id: number, status: OfflinePackage['status']) {
  return request<OfflinePackage>(`/admin/offline-packages/${id}/status`, { method: 'PUT', body: { status } });
}

export function listRiskEvents() {
  return request<RiskEvent[]>('/admin/risk-events');
}

export function createRiskEvent(input: CreateRiskEventInput) {
  return request<RiskEvent>('/admin/risk-events', { method: 'POST', body: input });
}

export function getRiskSummary() {
  return request<RiskSummary>('/admin/risk-summary');
}

export function updateRiskEventStatus(id: number, status: RiskEvent['status']) {
  return request<RiskEvent>(`/admin/risk-events/${id}/status`, { method: 'PUT', body: { status } });
}

export function listDeviceUnbindRequests() {
  return request<DeviceUnbindRequest[]>('/admin/device-unbind-requests');
}

export function createDeviceUnbindRequest(input: CreateDeviceUnbindRequestInput) {
  return request<DeviceUnbindRequest>('/admin/device-unbind-requests', { method: 'POST', body: input });
}

export function reviewDeviceUnbindRequest(id: number, status: 'approved' | 'rejected') {
  return request<DeviceUnbindRequest>(`/admin/device-unbind-requests/${id}/review`, { method: 'PUT', body: { status } });
}

export function listProtectorAdapters() {
  return request<ProtectorAdapter[]>('/admin/protector-adapters');
}

export function createProtectorAdapter(input: CreateProtectorAdapterInput) {
  return request<ProtectorAdapter>('/admin/protector-adapters', { method: 'POST', body: input });
}

export function updateProtectorAdapterStatus(id: number, status: ProtectorAdapter['status']) {
  return request<ProtectorAdapter>(`/admin/protector-adapters/${id}/status`, { method: 'PUT', body: { status } });
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.auth !== false) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const payload = await parseApiResponse<T>(response);
  if (!response.ok || payload.code !== 'OK') {
    throw new Error(payload.message || payload.code || '请求失败');
  }
  return payload.data;
}

async function parseApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const text = await response.text();
  if (!text.trim()) {
    return {
      code: response.ok ? 'OK' : `HTTP_${response.status}`,
      message: response.ok ? 'success' : `请求失败：HTTP ${response.status}`,
      data: null as T,
    };
  }

  try {
    return JSON.parse(text) as ApiResponse<T>;
  } catch {
    return {
      code: `HTTP_${response.status}`,
      message: response.ok ? '服务器返回了非 JSON 响应' : `请求失败：HTTP ${response.status}`,
      data: null as T,
    };
  }
}
