import { createHmac, randomUUID } from 'crypto';
import { ActivateResult, ApiResponse, DeviceInfo, HeartbeatResult, LicenseSdkError, VerifyResult } from './types';

export class LicenseApiClient {
  private readonly fetchImpl: typeof fetch;

  constructor(
    private readonly apiBaseUrl: string,
    private readonly productCode: string,
    fetchImpl?: typeof fetch,
    private readonly requestSigningSecret?: string,
  ) {
    this.fetchImpl = fetchImpl ?? fetch;
  }

  activate(licenseKey: string, device: DeviceInfo) {
    return this.post<ActivateResult>('/api/v1/license/activate', { productCode: this.productCode, licenseKey, device });
  }

  verify(leaseToken: string, deviceCode: string, appVersion: string) {
    return this.post<VerifyResult>('/api/v1/license/verify', { productCode: this.productCode, leaseToken, deviceCode, appVersion });
  }

  heartbeat(leaseToken: string, deviceCode: string, appVersion: string, runtime: Record<string, unknown> = {}) {
    return this.post<HeartbeatResult>('/api/v1/license/heartbeat', { productCode: this.productCode, leaseToken, deviceCode, appVersion, runtime });
  }

  deactivate(licenseKey: string, deviceCode: string) {
    return this.post<null>('/api/v1/license/deactivate', { productCode: this.productCode, licenseKey, deviceCode });
  }

  async versionPolicy() {
    const path = `/api/v1/version/policy?productCode=${encodeURIComponent(this.productCode)}`;
    return this.request(new URL(path, this.apiBaseUrl).toString(), { method: 'GET' }, path, {});
  }

  private post<T>(path: string, body: unknown) {
    return this.request<T>(new URL(path, this.apiBaseUrl).toString(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: stableStringify(body),
    }, path, body);
  }

  private async request<T>(url: string, init: RequestInit, path: string, body: unknown): Promise<T> {
    let response: Response;
    try {
      response = await this.fetchImpl(url, this.withSignature(init, path, body));
    } catch (error) {
      throw new LicenseSdkError('NETWORK_ERROR', error instanceof Error ? error.message : 'network error');
    }

    let payload: ApiResponse<T>;
    try {
      payload = (await response.json()) as ApiResponse<T>;
    } catch {
      throw new LicenseSdkError('NETWORK_ERROR', `invalid response: ${response.status}`);
    }

    if (!response.ok || payload.code !== 'OK') {
      throw new LicenseSdkError(payload.code, payload.message, payload.data);
    }
    return payload.data as T;
  }

  private withSignature(init: RequestInit, path: string, body: unknown): RequestInit {
    if (!this.requestSigningSecret) return init;
    const timestamp = String(Date.now());
    const nonce = randomUUID();
    const method = init.method ?? 'GET';
    const canonicalBody = stableStringify(body);
    const signature = createHmac('sha256', this.requestSigningSecret)
      .update([method.toUpperCase(), path, timestamp, nonce, canonicalBody].join('\n'))
      .digest('base64url');
    return {
      ...init,
      headers: {
        ...(init.headers as Record<string, string> | undefined),
        'x-entitlement-timestamp': timestamp,
        'x-entitlement-nonce': nonce,
        'x-entitlement-signature': signature,
      },
    };
  }
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`).join(',')}}`;
}
