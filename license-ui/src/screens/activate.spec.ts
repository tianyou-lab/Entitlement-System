import { describe, expect, it, vi } from 'vitest';
import { bindActivate, renderActivate } from './activate';

const theme = { productName: 'Demo', primaryColor: '#2563eb', supportText: '联系客服', texts: {} };

describe('activate screen', () => {
  it('renders activation form', () => {
    document.body.innerHTML = renderActivate(theme);
    expect(document.querySelector('#license-key')).toBeTruthy();
    expect(document.body.textContent).toContain('立即激活');
  });

  it('shows validation error for empty key', async () => {
    document.body.innerHTML = renderActivate(theme);
    bindActivate(theme, vi.fn());
    document.querySelector<HTMLFormElement>('#activate-form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(document.querySelector('#error-message')?.textContent).toContain('BAD_REQUEST');
  });
});
