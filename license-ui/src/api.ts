import { ActivationResult, LicenseUiTheme } from './types';

export async function activateLicense(licenseKey: string, theme: LicenseUiTheme): Promise<ActivationResult> {
  if (window.licenseBridge?.activate) {
    return window.licenseBridge.activate(licenseKey);
  }
  if (!theme.apiBaseUrl) {
    return { ok: false, code: 'NO_BRIDGE', message: '未配置 Electron Bridge 或 apiBaseUrl' };
  }

  try {
    const response = await fetch(new URL('/api/v1/license/activate', theme.apiBaseUrl || window.location.origin), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        productCode: new URLSearchParams(window.location.search).get('productCode') || 'demo_app',
        licenseKey,
        device: {
          deviceCode: `web_${navigator.userAgent.length}_${screen.width}x${screen.height}`,
          fingerprintHash: btoa(navigator.userAgent).slice(0, 64),
          deviceName: navigator.platform || 'browser',
          osType: navigator.platform || 'browser',
          osVersion: navigator.userAgent,
          appVersion: new URLSearchParams(window.location.search).get('appVersion') || '1.0.0',
          hardwareSummary: { userAgent: navigator.userAgent },
        },
      }),
    });
    const payload = await response.json();
    return payload.code === 'OK'
      ? { ok: true }
      : { ok: false, code: payload.code, message: payload.message };
  } catch (error) {
    return { ok: false, code: 'NETWORK_ERROR', message: error instanceof Error ? error.message : '网络异常' };
  }
}
