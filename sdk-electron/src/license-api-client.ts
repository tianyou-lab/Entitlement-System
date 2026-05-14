import { ActivateResult, ApiResponse, DeviceInfo, HeartbeatResult, LicenseSdkError, VerifyResult } from './types';

export class LicenseApiClient {
  private readonly fetchImpl: typeof fetch;

  constructor(
    private readonly apiBaseUrl: string,
    private readonly productCode: string,
    fetchImpl?: typeof fetch,
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
    const url = new URL('/api/v1/version/policy', this.apiBaseUrl);
    url.searchParams.set('productCode', this.productCode);
    return this.request(url.toString(), { method: 'GET' });
  }

  private post<T>(path: string, body: unknown) {
    return this.request<T>(new URL(path, this.apiBaseUrl).toString(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  private async request<T>(url: string, init: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await this.fetchImpl(url, init);
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
}
