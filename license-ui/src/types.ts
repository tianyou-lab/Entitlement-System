export type LicenseUiState = 'activate' | 'expired' | 'device-limit' | 'force-upgrade' | 'network-error' | 'banned' | 'invalid';

export interface LicenseUiTheme {
  productName: string;
  logoUrl?: string;
  primaryColor: string;
  supportText: string;
  apiBaseUrl?: string;
  texts: Partial<Record<LicenseUiState | 'title' | 'subtitle', string>>;
}

export interface ActivationResult {
  ok: boolean;
  code?: string;
  message?: string;
}

declare global {
  interface Window {
    __LICENSE_UI_CONFIG__?: Partial<LicenseUiTheme>;
    licenseBridge?: {
      activate(licenseKey: string): Promise<ActivationResult>;
      getState?(): Promise<unknown>;
    };
  }
}
