import { activateLicense } from '../api';
import { LicenseUiTheme } from '../types';

export function renderActivate(theme: LicenseUiTheme) {
  return `
    <section class="card" data-testid="activate-screen">
      ${theme.logoUrl ? `<img class="logo" src="${theme.logoUrl}" alt="${theme.productName}" />` : `<div class="logo-mark">${theme.productName.slice(0, 1)}</div>`}
      <p class="eyebrow">${theme.productName}</p>
      <h1>${theme.texts.title ?? '软件授权'}</h1>
      <p class="description">${theme.texts.subtitle ?? '请输入 License Key 完成激活'}</p>
      <form id="activate-form" class="form">
        <label for="license-key">License Key</label>
        <input id="license-key" name="licenseKey" autocomplete="off" placeholder="XXXX-XXXX-XXXX" />
        <p class="error" id="error-message" hidden></p>
        <button class="primary" type="submit">立即激活</button>
      </form>
      <button class="ghost" id="copy-error" hidden>复制错误码</button>
      <p class="support">${theme.supportText}</p>
    </section>
  `;
}

export function bindActivate(theme: LicenseUiTheme, onActivated: () => void) {
  const form = document.querySelector<HTMLFormElement>('#activate-form');
  const input = document.querySelector<HTMLInputElement>('#license-key');
  const error = document.querySelector<HTMLParagraphElement>('#error-message');
  const copy = document.querySelector<HTMLButtonElement>('#copy-error');
  let lastCode = '';

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const licenseKey = input?.value.trim() ?? '';
    if (!licenseKey) {
      showError('BAD_REQUEST', '请输入 License Key');
      return;
    }

    const result = await activateLicense(licenseKey, theme);
    if (result.ok) {
      onActivated();
      return;
    }
    showError(result.code ?? 'UNKNOWN', result.message ?? '激活失败');
  });

  copy?.addEventListener('click', async () => {
    if (lastCode) {
      await navigator.clipboard?.writeText(lastCode);
    }
  });

  function showError(code: string, message: string) {
    lastCode = code;
    if (error) {
      error.hidden = false;
      error.textContent = `${code}: ${message}`;
    }
    if (copy) {
      copy.hidden = false;
    }
  }
}
