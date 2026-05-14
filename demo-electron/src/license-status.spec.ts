import { describe, expect, it } from 'vitest';
import { isUsableStatus, toDemoLicenseView } from './license-status';

describe('license-status', () => {
  it('maps SDK state to demo view', () => {
    const view = toDemoLicenseView(
      { status: 'active', featureFlags: { publish: true, maxWindowCount: 20 }, leaseExpireAt: '2099-01-01T00:00:00.000Z' },
      (key) => key === 'publish',
      (key) => (key === 'maxWindowCount' ? 20 : undefined),
    );

    expect(view).toMatchObject({ status: 'active', canPublish: true, maxWindowCount: 20 });
  });

  it('treats active and grace as usable', () => {
    expect(isUsableStatus('active')).toBe(true);
    expect(isUsableStatus('grace')).toBe(true);
    expect(isUsableStatus('banned')).toBe(false);
  });
});
