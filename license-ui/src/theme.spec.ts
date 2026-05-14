import { describe, expect, it, beforeEach } from 'vitest';
import { applyTheme, loadTheme } from './theme';

describe('theme', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.history.replaceState(null, '', '/?productName=Pro&primaryColor=%23ff0000');
    window.__LICENSE_UI_CONFIG__ = undefined;
  });

  it('loads query theme and applies color', () => {
    const theme = loadTheme();
    applyTheme(theme);
    expect(theme.productName).toBe('Pro');
    expect(document.documentElement.style.getPropertyValue('--primary-color')).toBe('#ff0000');
  });
});
