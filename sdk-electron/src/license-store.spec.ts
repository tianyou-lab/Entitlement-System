import { mkdtempSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { LicenseStore } from './license-store';

describe('LicenseStore', () => {
  it('writes and reads encrypted cache', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'license-store-')), 'cache.bin');
    const store = new LicenseStore('demo', path);
    store.write({ leaseToken: 'secret-token', leaseExpireAt: new Date(Date.now() + 1000).toISOString(), deviceCode: 'dev', featureFlags: { publish: true }, lastVerifiedAt: new Date().toISOString(), licenseStatus: 'active' });

    expect(store.read()).toMatchObject({ leaseToken: 'secret-token', featureFlags: { publish: true } });
    expect(readFileSync(path, 'utf8')).not.toContain('secret-token');
  });

  it('returns null for missing cache', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'license-store-')), 'missing.bin');
    expect(new LicenseStore('demo', path).read()).toBeNull();
  });
});
