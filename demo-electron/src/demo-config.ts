import { app } from 'electron';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { pathToFileURL } from 'url';

export interface DemoConfig {
  apiBaseUrl: string;
  productCode: string;
  appVersion: string;
  licenseUiUrl: string;
  storagePath: string;
  heartbeatIntervalMs: number;
  requestSigningSecret?: string;
}

interface FileConfig {
  apiBaseUrl?: string;
  productCode?: string;
  appVersion?: string;
  licenseUiUrl?: string;
  heartbeatIntervalMs?: number;
  requestSigningSecret?: string;
}

export function createDemoConfig(): DemoConfig {
  const fileConfig = readClientConfigFile();
  return {
    apiBaseUrl: process.env.LICENSE_API_BASE_URL ?? fileConfig.apiBaseUrl ?? 'http://127.0.0.1:3000',
    productCode: process.env.LICENSE_PRODUCT_CODE ?? fileConfig.productCode ?? 'demo_app',
    appVersion: (process.env.LICENSE_APP_VERSION ?? fileConfig.appVersion ?? app.getVersion()) || '1.0.0',
    licenseUiUrl: process.env.LICENSE_UI_URL ?? fileConfig.licenseUiUrl ?? pathToFileURL(resolve(__dirname, '../../../license-ui/dist/index.html')).toString(),
    storagePath: join(app.getPath('userData'), 'license-cache.bin'),
    heartbeatIntervalMs: process.env.LICENSE_HEARTBEAT_INTERVAL_MS
      ? Number(process.env.LICENSE_HEARTBEAT_INTERVAL_MS)
      : fileConfig.heartbeatIntervalMs ?? 30_000,
    requestSigningSecret: process.env.LICENSE_REQUEST_SIGNING_SECRET
      ?? process.env.ENTITLEMENT_REQUEST_SIGNING_SECRET
      ?? fileConfig.requestSigningSecret,
  };
}

function readClientConfigFile(): FileConfig {
  const configPath = resolveClientConfigPath();
  if (!configPath || !existsSync(configPath)) return {};

  try {
    return JSON.parse(readFileSync(configPath, 'utf8')) as FileConfig;
  } catch (error) {
    throw new Error(`Invalid license client config at ${configPath}: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}

function resolveClientConfigPath(): string | undefined {
  if (process.env.LICENSE_CLIENT_CONFIG_PATH) return process.env.LICENSE_CLIENT_CONFIG_PATH;

  const candidates = [
    join(process.cwd(), 'entitlement-client.config.json'),
    join(app.getPath('userData'), 'entitlement-client.config.json'),
  ];

  if (process.resourcesPath) {
    candidates.unshift(join(process.resourcesPath, 'entitlement-client.config.json'));
  }

  return candidates.find((candidate) => existsSync(candidate));
}
