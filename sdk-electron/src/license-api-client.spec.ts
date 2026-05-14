import { LicenseApiClient } from './license-api-client';
import { LicenseSdkError } from './types';

function mockResponse(body: unknown, ok = true, status = 200) {
  return Promise.resolve({ ok, status, json: () => Promise.resolve(body) } as Response);
}

describe('LicenseApiClient', () => {
  it('returns data for OK response', async () => {
    const fetchImpl = jest.fn().mockReturnValue(mockResponse({ code: 'OK', message: 'activated', data: { leaseToken: 'token' } }));
    const client = new LicenseApiClient('http://localhost:3000', 'demo', fetchImpl as any);
    await expect(client.activate('LIC', { deviceCode: 'dev', fingerprintHash: 'hash', deviceName: 'pc', osType: 'windows', osVersion: '11', appVersion: '1.0.0', hardwareSummary: {} })).resolves.toEqual({ leaseToken: 'token' });
  });

  it('throws SDK error for API error code', async () => {
    const fetchImpl = jest.fn().mockReturnValue(mockResponse({ code: 'LICENSE_BANNED', message: 'banned', data: null }, false, 403));
    const client = new LicenseApiClient('http://localhost:3000', 'demo', fetchImpl as any);
    await expect(client.verify('token', 'dev', '1.0.0')).rejects.toMatchObject({ code: 'LICENSE_BANNED' });
  });

  it('maps fetch failure to NETWORK_ERROR', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('offline'));
    const client = new LicenseApiClient('http://localhost:3000', 'demo', fetchImpl as any);
    await expect(client.versionPolicy()).rejects.toBeInstanceOf(LicenseSdkError);
    await expect(client.versionPolicy()).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
});
