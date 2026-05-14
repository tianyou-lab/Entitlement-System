import { FeatureGate } from './feature-gate';
import { HeartbeatScheduler } from './heartbeat-scheduler';

describe('HeartbeatScheduler', () => {
  it('refreshes lease and updates cache', async () => {
    const cache = { leaseToken: 'old', leaseExpireAt: new Date().toISOString(), deviceCode: 'dev', featureFlags: {}, lastVerifiedAt: new Date().toISOString(), licenseStatus: 'active' };
    const api = { heartbeat: jest.fn().mockResolvedValue({ leaseToken: 'new', leaseExpireAt: '2099-01-01T00:00:00.000Z', featureFlags: { publish: true }, versionPolicy: { forceUpgrade: false } }) } as any;
    const store = { read: jest.fn().mockReturnValue(cache), write: jest.fn() } as any;
    const gate = new FeatureGate();
    const scheduler = new HeartbeatScheduler(api, store, gate, '1.0.0');

    await scheduler.tick();

    expect(store.write).toHaveBeenCalledWith(expect.objectContaining({ leaseToken: 'new', featureFlags: { publish: true } }));
    expect(gate.hasFeature('publish')).toBe(true);
  });

  it('stops on banned response', async () => {
    const api = { heartbeat: jest.fn().mockRejectedValue({ code: 'LICENSE_BANNED', message: 'banned' }) } as any;
    const store = { read: jest.fn().mockReturnValue({ leaseToken: 'old', leaseExpireAt: new Date().toISOString(), deviceCode: 'dev', featureFlags: {}, lastVerifiedAt: new Date().toISOString(), licenseStatus: 'active' }) } as any;
    const scheduler = new HeartbeatScheduler(api, store, new FeatureGate(), '1.0.0', 1000);
    scheduler.start();
    await scheduler.tick();
    scheduler.stop();
    expect(api.heartbeat).toHaveBeenCalled();
  });
});
