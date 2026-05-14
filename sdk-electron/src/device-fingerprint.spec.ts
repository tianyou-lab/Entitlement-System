import { DeviceFingerprint } from './device-fingerprint';

describe('DeviceFingerprint', () => {
  it('generates stable values with overrides', () => {
    const device = DeviceFingerprint.collect('1.2.3', { deviceCode: 'dev-fixed', fingerprintHash: 'hash-fixed' });
    expect(device).toMatchObject({ deviceCode: 'dev-fixed', fingerprintHash: 'hash-fixed', appVersion: '1.2.3' });
  });
});
