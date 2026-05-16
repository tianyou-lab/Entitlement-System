import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/entitlement-user-data'),
    getVersion: vi.fn(() => '0.1.0'),
  },
}));

const envKeys = [
  'LICENSE_API_BASE_URL',
  'LICENSE_PRODUCT_CODE',
  'LICENSE_APP_VERSION',
  'LICENSE_UI_URL',
  'LICENSE_HEARTBEAT_INTERVAL_MS',
  'LICENSE_REQUEST_SIGNING_SECRET',
  'ENTITLEMENT_REQUEST_SIGNING_SECRET',
  'LICENSE_CLIENT_CONFIG_PATH',
];

describe('createDemoConfig', () => {
  let tempDir: string;

  beforeEach(() => {
    vi.resetModules();
    tempDir = mkdtempSync(join(tmpdir(), 'entitlement-demo-config-'));
    for (const key of envKeys) delete process.env[key];
  });

  afterEach(() => {
    for (const key of envKeys) delete process.env[key];
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('reads packaged client config values', async () => {
    const configPath = join(tempDir, 'entitlement-client.config.json');
    writeFileSync(configPath, JSON.stringify({
      apiBaseUrl: 'https://license.example.com',
      productCode: 'win_app',
      appVersion: '2.0.0',
      heartbeatIntervalMs: 60000,
      requestSigningSecret: 'file-secret',
    }));
    process.env.LICENSE_CLIENT_CONFIG_PATH = configPath;

    const { createDemoConfig } = await import('./demo-config');

    expect(createDemoConfig()).toMatchObject({
      apiBaseUrl: 'https://license.example.com',
      productCode: 'win_app',
      appVersion: '2.0.0',
      heartbeatIntervalMs: 60000,
      requestSigningSecret: 'file-secret',
    });
  });

  it('lets environment variables override the client config file', async () => {
    const configPath = join(tempDir, 'entitlement-client.config.json');
    writeFileSync(configPath, JSON.stringify({
      apiBaseUrl: 'https://license.example.com',
      requestSigningSecret: 'file-secret',
    }));
    process.env.LICENSE_CLIENT_CONFIG_PATH = configPath;
    process.env.LICENSE_API_BASE_URL = 'https://override.example.com';
    process.env.LICENSE_REQUEST_SIGNING_SECRET = 'env-secret';

    const { createDemoConfig } = await import('./demo-config');

    expect(createDemoConfig()).toMatchObject({
      apiBaseUrl: 'https://override.example.com',
      requestSigningSecret: 'env-secret',
    });
  });
});
