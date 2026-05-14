import { app } from 'electron';
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

export function createDemoConfig(): DemoConfig {
  return {
    apiBaseUrl: process.env.LICENSE_API_BASE_URL ?? 'http://127.0.0.1:3000',
    productCode: process.env.LICENSE_PRODUCT_CODE ?? 'demo_app',
    appVersion: app.getVersion() || '1.0.0',
    licenseUiUrl: process.env.LICENSE_UI_URL ?? pathToFileURL(resolve(__dirname, '../../../license-ui/dist/index.html')).toString(),
    storagePath: join(app.getPath('userData'), 'license-cache.bin'),
    heartbeatIntervalMs: process.env.LICENSE_HEARTBEAT_INTERVAL_MS ? Number(process.env.LICENSE_HEARTBEAT_INTERVAL_MS) : 30_000,
    requestSigningSecret: process.env.LICENSE_REQUEST_SIGNING_SECRET ?? process.env.ENTITLEMENT_REQUEST_SIGNING_SECRET,
  };
}
