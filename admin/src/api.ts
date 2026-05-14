import type { ApiResponse, CreateLicenseInput, CreatePlanInput, CreateProductInput, License, LoginResult, Plan, Product } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3000';
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
  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok || payload.code !== 'OK') {
    throw new Error(payload.message || payload.code || '请求失败');
  }
  return payload.data;
}
