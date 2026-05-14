import { createHash } from 'crypto';
import { arch, hostname, platform, release, userInfo } from 'os';
import { DeviceInfo } from './types';

export class DeviceFingerprint {
  static collect(appVersion: string, overrides: Partial<DeviceInfo> = {}): DeviceInfo {
    const summary = {
      hostname: hostname(),
      platform: platform(),
      arch: arch(),
      release: release(),
      user: hash(userInfo().username),
      ...overrides.hardwareSummary,
    };
    const fingerprintHash = overrides.fingerprintHash ?? hash(JSON.stringify(summary));
    const deviceCode = overrides.deviceCode ?? `dev_${fingerprintHash.slice(0, 24)}`;

    return {
      deviceCode,
      fingerprintHash,
      deviceName: overrides.deviceName ?? hostname(),
      osType: overrides.osType ?? platform(),
      osVersion: overrides.osVersion ?? release(),
      appVersion: overrides.appVersion ?? appVersion,
      hardwareSummary: summary,
    };
  }
}

function hash(value: string) {
  return createHash('sha256').update(value).digest('hex');
}
