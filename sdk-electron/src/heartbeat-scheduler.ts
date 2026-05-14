import { LicenseApiClient } from './license-api-client';
import { LicenseStore } from './license-store';
import { FeatureGate } from './feature-gate';
import { LicenseCache, LicenseState } from './types';

export class HeartbeatScheduler {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly api: LicenseApiClient,
    private readonly store: LicenseStore,
    private readonly featureGate: FeatureGate,
    private readonly appVersion: string,
    private readonly intervalMs = 10 * 60 * 1000,
    private readonly onState?: (state: LicenseState) => void,
  ) {}

  start() {
    if (this.timer) {
      return;
    }
    this.timer = setInterval(() => void this.tick(), this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async tick() {
    const cache = this.store.read();
    if (!cache) {
      this.stop();
      this.onState?.({ status: 'inactive', featureFlags: {} });
      return;
    }

    try {
      const result = await this.api.heartbeat(cache.leaseToken, cache.deviceCode, this.appVersion, { ts: Date.now() });
      const next: LicenseCache = {
        ...cache,
        leaseToken: result.leaseToken,
        leaseExpireAt: result.leaseExpireAt,
        featureFlags: result.featureFlags,
        lastVerifiedAt: new Date().toISOString(),
        licenseStatus: 'active',
      };
      this.store.write(next);
      this.featureGate.update(result.featureFlags);
      this.onState?.({ status: 'active', featureFlags: result.featureFlags, leaseExpireAt: result.leaseExpireAt });
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : 'NETWORK_ERROR';
      if (['LICENSE_BANNED', 'LICENSE_EXPIRED', 'DEVICE_REMOVED', 'LEASE_EXPIRED', 'LEASE_INVALID'].includes(code)) {
        this.stop();
      }
      this.onState?.({ status: mapCodeToState(code), code, message: error instanceof Error ? error.message : code, featureFlags: cache.featureFlags });
    }
  }
}

function mapCodeToState(code: string): LicenseState['status'] {
  if (code === 'LICENSE_BANNED') return 'banned';
  if (code === 'LICENSE_EXPIRED' || code === 'LEASE_EXPIRED') return 'expired';
  if (code === 'DEVICE_REMOVED') return 'device-removed';
  if (code === 'NETWORK_ERROR') return 'network-error';
  return 'invalid';
}
