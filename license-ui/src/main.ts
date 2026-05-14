import './styles.css';
import { bindActivate, renderActivate } from './screens/activate';
import { renderStatus } from './screens/status';
import { applyTheme, loadTheme } from './theme';
import { LicenseUiState } from './types';

export function renderApp() {
  const theme = loadTheme();
  applyTheme(theme);
  const params = new URLSearchParams(window.location.search);
  const state = (params.get('state') || 'activate') as LicenseUiState;
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) return;

  if (state === 'activate') {
    app.innerHTML = renderActivate(theme);
    bindActivate(theme, () => {
      app.innerHTML = renderStatus('invalid', { ...theme, texts: { ...theme.texts, invalid: '激活成功' }, supportText: '授权已激活，请返回应用继续使用。' });
    });
    return;
  }

  app.innerHTML = renderStatus(state, theme);
}

renderApp();
