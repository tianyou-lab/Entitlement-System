import { DeviceFingerprint } from './device-fingerprint';
import { FeatureGate } from './feature-gate';
import { HeartbeatScheduler } from './heartbeat-scheduler';
import { LeaseVerifier } from './lease-verifier';
import { LicenseApiClient } from './license-api-client';
import { LicenseStore } from './license-store';
import { LicenseCache, LicenseSdkConfig, LicenseState } from './types';

export class LicenseClient {
  private readonly api: LicenseApiClient;
  private readonly store: LicenseStore;
  private readonly verifier: LeaseVerifier;
  private readonly featureGate = new FeatureGate();
  private readonly heartbeat: HeartbeatScheduler;
  private state: LicenseState = { status: 'inactive', featureFlags: {} };

  constructor(private readonly config: LicenseSdkConfig) {
    this.api = new LicenseApiClient(config.apiBaseUrl, config.productCode, config.fetchImpl, config.requestSigningSecret);
    this.store = new LicenseStore(config.productCode, config.storagePath);
    this.verifier = new LeaseVerifier(config.graceHours ?? 24);
    this.heartbeat = new HeartbeatScheduler(
      this.api,
      this.store,
      this.featureGate,
      config.appVersion,
      config.heartbeatIntervalMs,
      (state) => this.setState(state),
    );

    const cache = this.store.read();
    if (cache) {
      this.featureGate.update(cache.featureFlags);
      this.setState({ status: 'inactive', featureFlags: cache.featureFlags, leaseExpireAt: cache.leaseExpireAt });
    }
  }

  async activate(licenseKey: string) {
    const device = DeviceFingerprint.collect(this.config.appVersion, this.config.device);
    const result = await this.api.activate(licenseKey, device);
    const cache: LicenseCache = {
      leaseToken: result.leaseToken,
      leaseExpireAt: result.leaseExpireAt,
      deviceCode: device.deviceCode,
      featureFlags: result.featureFlags,
      lastVerifiedAt: new Date().toISOString(),
      licenseStatus: result.licenseStatus,
    };
    this.store.write(cache);
    this.featureGate.update(result.featureFlags);
    this.setState({ status: 'active', featureFlags: result.featureFlags, leaseExpireAt: result.leaseExpireAt });
    return result;
  }

  async verifyOnStartup() {
    const cache = this.store.read();
    const local = this.verifier.check(cache);
    if (local.status === 'missing' || local.status === 'invalid') {
      this.setState({ status: 'inactive', featureFlags: {} });
      return this.state;
    }
    if (local.status === 'expired') {
      this.setState({ status: 'expired', featureFlags: local.cache.featureFlags, leaseExpireAt: local.cache.leaseExpireAt });
      return this.state;
    }

    try {
      const result = await this.api.verify(local.cache.leaseToken, local.cache.deviceCode, this.config.appVersion);
      const next = {
        ...local.cache,
        featureFlags: result.featureFlags,
        lastVerifiedAt: new Date().toISOString(),
        licenseStatus: result.licenseStatus,
      };
      this.store.write(next);
      this.featureGate.update(result.featureFlags);
      this.setState({ status: local.status === 'grace' ? 'grace' : 'active', featureFlags: result.featureFlags, leaseExpireAt: next.leaseExpireAt });
      return this.state;
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : 'NETWORK_ERROR';
      if (code === 'NETWORK_ERROR' && local.status === 'grace') {
        this.setState({ status: 'grace', code, message: error instanceof Error ? error.message : code, featureFlags: local.cache.featureFlags, leaseExpireAt: local.cache.leaseExpireAt });
        return this.state;
      }
      this.setState({ status: mapCodeToState(code), code, message: error instanceof Error ? error.message : code, featureFlags: local.cache.featureFlags, leaseExpireAt: local.cache.leaseExpireAt });
      return this.state;
    }
  }

  startHeartbeat() {
    this.heartbeat.start();
  }

  stopHeartbeat() {
    this.heartbeat.stop();
  }

  async deactivate(licenseKey: string) {
    const cache = this.store.read();
    if (cache) {
      await this.api.deactivate(licenseKey, cache.deviceCode);
    }
    this.store.clear();
    this.featureGate.update({});
    this.setState({ status: 'inactive', featureFlags: {} });
  }

  hasFeature(key: string) {
    return this.featureGate.hasFeature(key);
  }

  getLimit(key: string) {
    return this.featureGate.getLimit(key);
  }

  getState() {
    return { ...this.state, featureFlags: { ...this.state.featureFlags } };
  }

  private setState(state: LicenseState) {
    this.state = state;
  }
}

function mapCodeToState(code: string): LicenseState['status'] {
  if (code === 'LICENSE_BANNED') return 'banned';
  if (code === 'LICENSE_EXPIRED' || code === 'LEASE_EXPIRED') return 'expired';
  if (code === 'DEVICE_REMOVED') return 'device-removed';
  if (code === 'NETWORK_ERROR') return 'network-error';
  return 'invalid';
}
