import { HttpStatus, Injectable } from '@nestjs/common';
import { LicenseStatus, PlanStatus } from '@prisma/client';
import { ErrorCode } from '../common/error-codes';
import { AppError } from '../common/errors';
import { PrismaService } from '../database/prisma.service';
import { PlanService } from '../plan/plan.service';

@Injectable()
export class LicenseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planService: PlanService,
  ) {}

  async validateLicense(productCode: string, licenseKey: string) {
    const license = await this.prisma.license.findUnique({
      where: { licenseKey },
      include: { product: true, plan: true },
    });

    if (!license) {
      throw new AppError(ErrorCode.LICENSE_NOT_FOUND, 'license not found');
    }
    if (license.product.productCode !== productCode) {
      throw new AppError(ErrorCode.PRODUCT_MISMATCH, 'product mismatch');
    }
    if (license.status === LicenseStatus.banned) {
      throw new AppError(ErrorCode.LICENSE_BANNED, 'license banned', HttpStatus.FORBIDDEN);
    }
    if (license.status !== LicenseStatus.active) {
      throw new AppError(ErrorCode.LICENSE_INACTIVE, 'license inactive');
    }
    if (license.expireAt && license.expireAt.getTime() <= Date.now()) {
      throw new AppError(ErrorCode.LICENSE_EXPIRED, 'license expired');
    }
    if (license.plan.status !== PlanStatus.active) {
      throw new AppError(ErrorCode.PLAN_INVALID, 'plan invalid');
    }

    return license;
  }

  async ensureRuntimeValid(licenseId: number, productCode: string) {
    const license = await this.prisma.license.findUnique({
      where: { id: licenseId },
      include: { product: true, plan: true },
    });
    if (!license) {
      throw new AppError(ErrorCode.LICENSE_NOT_FOUND, 'license not found');
    }
    return this.validateLicense(productCode, license.licenseKey);
  }

  featureFlags(license: { plan: { featureFlags: unknown }; featureFlagsOverride: unknown }) {
    return this.planService.mergeFeatureFlags(license.plan.featureFlags, license.featureFlagsOverride);
  }

  maxDevices(license: { plan: { maxDevices: number }; maxDevicesOverride: number | null }) {
    return license.maxDevicesOverride ?? license.plan.maxDevices;
  }
}
