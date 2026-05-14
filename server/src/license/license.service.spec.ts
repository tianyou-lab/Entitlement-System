import { LicenseStatus, PlanStatus, ProductStatus } from '@prisma/client';
import { ErrorCode } from '../common/error-codes';
import { PlanService } from '../plan/plan.service';
import { LicenseService } from './license.service';

function createService(license: any) {
  const prisma = { license: { findUnique: jest.fn().mockResolvedValue(license) } } as any;
  const planService = new PlanService(prisma);
  return { service: new LicenseService(prisma, planService), prisma };
}

const validLicense = {
  id: 1,
  licenseKey: 'LIC-1',
  status: LicenseStatus.active,
  expireAt: new Date(Date.now() + 60_000),
  featureFlagsOverride: { publish: false },
  maxDevicesOverride: null,
  product: { productCode: 'demo', status: ProductStatus.active },
  plan: { status: PlanStatus.active, maxDevices: 1, featureFlags: { publish: true, maxWindowCount: 3 } },
};

describe('LicenseService', () => {
  it('validates an active license', async () => {
    const { service } = createService(validLicense);
    await expect(service.validateLicense('demo', 'LIC-1')).resolves.toEqual(validLicense);
  });

  it('rejects product mismatch', async () => {
    const { service } = createService(validLicense);
    await expect(service.validateLicense('other', 'LIC-1')).rejects.toMatchObject({ code: ErrorCode.PRODUCT_MISMATCH });
  });

  it('rejects inactive products', async () => {
    const { service } = createService({ ...validLicense, product: { ...validLicense.product, status: ProductStatus.inactive } });
    await expect(service.validateLicense('demo', 'LIC-1')).rejects.toMatchObject({ code: ErrorCode.PRODUCT_MISMATCH });
  });

  it('rejects expired license', async () => {
    const { service } = createService({ ...validLicense, expireAt: new Date(Date.now() - 1) });
    await expect(service.validateLicense('demo', 'LIC-1')).rejects.toMatchObject({ code: ErrorCode.LICENSE_EXPIRED });
  });

  it('merges feature flags with license override taking priority', () => {
    const { service } = createService(validLicense);
    expect(service.featureFlags(validLicense)).toEqual({ publish: false, maxWindowCount: 3 });
  });
});
