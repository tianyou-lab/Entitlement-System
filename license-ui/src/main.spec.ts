import { describe, expect, it, beforeEach, vi } from 'vitest';

describe('renderApp', () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '<div id="app"></div>';
    window.__LICENSE_UI_CONFIG__ = undefined;
  });

  it('renders activate screen by default', async () => {
    window.history.replaceState(null, '', '/');
    const { renderApp } = await import('./main');
    renderApp();
    expect(document.body.textContent).toContain('立即激活');
  });

  it('renders force upgrade screen from query state', async () => {
    window.history.replaceState(null, '', '/?state=force-upgrade');
    const { renderApp } = await import('./main');
    renderApp();
    expect(document.body.textContent).toContain('需要升级客户端');
  });
});
