import { LicenseState } from '@entitlement/sdk-electron';

export interface DemoLicenseView {
  status: LicenseState['status'];
  code?: string;
  message?: string;
  leaseExpireAt?: string;
  featureFlags: Record<string, unknown>;
  canPublish: boolean;
  maxWindowCount?: number;
}

export function toDemoLicenseView(state: LicenseState, hasFeature: (key: string) => boolean, getLimit: (key: string) => number | undefined): DemoLicenseView {
  return {
    status: state.status,
    code: state.code,
    message: state.message,
    leaseExpireAt: state.leaseExpireAt,
    featureFlags: state.featureFlags,
    canPublish: hasFeature('publish'),
    maxWindowCount: getLimit('maxWindowCount'),
  };
}

export function isUsableStatus(status: LicenseState['status']) {
  return status === 'active' || status === 'grace';
}
