import { describe, expect, it } from 'vitest';
import { renderStatus } from './status';

const theme = { productName: 'Demo', primaryColor: '#2563eb', supportText: '联系客服', texts: {} };

describe('renderStatus', () => {
  it('renders expired state', () => {
    document.body.innerHTML = renderStatus('expired', theme);
    expect(document.body.textContent).toContain('授权已到期');
  });

  it('renders device limit state', () => {
    document.body.innerHTML = renderStatus('device-limit', theme);
    expect(document.body.textContent).toContain('设备数量已满');
  });
});
