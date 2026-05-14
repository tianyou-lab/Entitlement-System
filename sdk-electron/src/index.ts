import { LicenseClient } from './license-client';
import { LicenseSdkConfig } from './types';

export { DeviceFingerprint } from './device-fingerprint';
export { FeatureGate } from './feature-gate';
export { HeartbeatScheduler } from './heartbeat-scheduler';
export { LeaseVerifier } from './lease-verifier';
export { LicenseApiClient } from './license-api-client';
export { LicenseClient } from './license-client';
export { LicenseStore } from './license-store';
export { createLicenseWindow, licenseBridgePreloadSource } from './license-window';
export * from './types';

export function init(config: LicenseSdkConfig) {
  return new LicenseClient(config);
}
