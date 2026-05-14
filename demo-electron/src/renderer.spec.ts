import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DemoLicenseView } from './license-status';

declare global {
  interface Window {
    demoLicense: {
      getState(): Promise<DemoLicenseView>;
      verify(): Promise<DemoLicenseView>;
      startHeartbeat(): Promise<DemoLicenseView>;
      stopHeartbeat(): Promise<DemoLicenseView>;
      deactivate(licenseKey: string): Promise<DemoLicenseView>;
      openLicenseWindow(): Promise<void>;
      onChanged(handler: (state: DemoLicenseView) => void): () => void;
    };
  }
}

describe('renderer', () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '<main id="app"></main>';
    window.demoLicense = {
      getState: vi.fn().mockResolvedValue({ status: 'active', featureFlags: { publish: true }, canPublish: true, maxWindowCount: 20 }),
      verify: vi.fn(),
      startHeartbeat: vi.fn(),
      stopHeartbeat: vi.fn(),
      deactivate: vi.fn(),
      openLicenseWindow: vi.fn(),
      onChanged: vi.fn().mockReturnValue(() => undefined),
    };
  });

  it('renders license state from preload bridge', async () => {
    await import('./renderer');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.body.textContent).toContain('active');
    expect(document.body.textContent).toContain('maxWindowCount');
  });
});
