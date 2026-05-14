import { LicenseUiTheme } from './types';

const defaults: LicenseUiTheme = {
  productName: 'Demo App',
  primaryColor: '#2563eb',
  supportText: '如需帮助，请联系管理员或客服。',
  texts: {
    title: '软件授权',
    subtitle: '请输入 License Key 完成激活',
  },
};

export function loadTheme(): LicenseUiTheme {
  const params = new URLSearchParams(window.location.search);
  const configured = window.__LICENSE_UI_CONFIG__ ?? {};
  return {
    ...defaults,
    ...configured,
    productName: params.get('productName') || configured.productName || defaults.productName,
    primaryColor: params.get('primaryColor') || configured.primaryColor || defaults.primaryColor,
    supportText: params.get('supportText') || configured.supportText || defaults.supportText,
    apiBaseUrl: params.get('apiBaseUrl') || configured.apiBaseUrl,
    texts: { ...defaults.texts, ...(configured.texts ?? {}) },
  };
}

export function applyTheme(theme: LicenseUiTheme) {
  document.documentElement.style.setProperty('--primary-color', theme.primaryColor);
  document.title = `${theme.productName} 授权`;
}
