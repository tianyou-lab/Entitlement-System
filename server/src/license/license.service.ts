import { HttpStatus, Injectable } from '@nestjs/common';
import { CardKeyStatus, LicenseStatus, PlanStatus, ProductStatus } from '@prisma/client';
import { ErrorCode } from '../common/error-codes';
import { AppError } from '../common/errors';
import { PrismaService } from '../database/prisma.service';
import { PlanService } from '../plan/plan.service';
import { hashLicenseKey, legacyHashLicenseKey } from './license-key';

@Injectable()
export class LicenseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planService: PlanService,
  ) {}

  async validateLicense(productCode: string, licenseKey: string) {
    const license = await this.findLicenseByKey(licenseKey) ?? await this.redeemCardKey(productCode, licenseKey);

    this.ensureValidLicenseRecord(license, productCode);
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
    this.ensureValidLicenseRecord(license, productCode);
    return license;
  }

  featureFlags(license: { plan: { featureFlags: unknown }; featureFlagsOverride: unknown }) {
    return this.planService.mergeFeatureFlags(license.plan.featureFlags, license.featureFlagsOverride);
  }

  maxDevices(license: { plan: { maxDevices: number }; maxDevicesOverride: number | null }) {
    return license.maxDevicesOverride ?? license.plan.maxDevices;
  }

  private async findLicenseByKey(licenseKey: string) {
    return await this.prisma.license.findUnique({
      where: { licenseKeyHash: hashLicenseKey(licenseKey) },
      include: { product: true, plan: true },
    }) ??
    await this.prisma.license.findUnique({
      where: { licenseKeyHash: legacyHashLicenseKey(licenseKey) },
      include: { product: true, plan: true },
    });
  }

  private async redeemCardKey(productCode: string, cardKeyValue: string) {
    const normalizedCardKey = cardKeyValue.trim().toUpperCase();
    const cardKey = await this.prisma.cardKey.findUnique({
      where: { cardKey: normalizedCardKey },
      include: { product: true, plan: true, license: { include: { product: true, plan: true } } },
    });

    if (!cardKey) return null;
    if (cardKey.license) return cardKey.license;
    if (cardKey.product.productCode !== productCode) throw new AppError(ErrorCode.PRODUCT_MISMATCH, 'product mismatch');
    if (cardKey.product.status !== ProductStatus.active) throw new AppError(ErrorCode.PRODUCT_MISMATCH, 'product mismatch');
    if (cardKey.plan.status !== PlanStatus.active) throw new AppError(ErrorCode.PLAN_INVALID, 'plan invalid');
    if (cardKey.status === CardKeyStatus.disabled) throw new AppError(ErrorCode.LICENSE_INACTIVE, 'card key disabled');
    if (cardKey.status === CardKeyStatus.redeemed) throw new AppError(ErrorCode.LICENSE_INACTIVE, 'card key already redeemed');
    if (cardKey.expireAt && cardKey.expireAt.getTime() <= Date.now()) throw new AppError(ErrorCode.LICENSE_EXPIRED, 'card key expired');

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.cardKey.findUnique({
        where: { cardKey: normalizedCardKey },
        include: { license: { include: { product: true, plan: true } } },
      });
      if (current?.license) return current.license;
      if (!current || (current.status !== CardKeyStatus.unused && current.status !== CardKeyStatus.issued)) {
        throw new AppError(ErrorCode.LICENSE_INACTIVE, 'card key already redeemed');
      }

      const license = await tx.license.create({
        data: {
          productId: cardKey.productId,
          planId: cardKey.planId,
          channelId: cardKey.channelId,
          licenseKeyHash: hashLicenseKey(normalizedCardKey),
          expireAt: new Date(Date.now() + this.planDurationMs(cardKey.plan)),
        },
        include: { product: true, plan: true },
      });
      await tx.cardKey.update({
        where: { id: cardKey.id },
        data: { status: CardKeyStatus.redeemed, licenseId: license.id, redeemedAt: new Date() },
      });
      return license;
    });
  }

  private planDurationMs(plan: { durationDays: number; featureFlags: unknown }) {
    if (plan.featureFlags && typeof plan.featureFlags === 'object' && !Array.isArray(plan.featureFlags)) {
      const durationSeconds = (plan.featureFlags as Record<string, unknown>).durationSeconds;
      if (typeof durationSeconds === 'number' && Number.isFinite(durationSeconds) && durationSeconds > 0) return durationSeconds * 1000;
    }
    return plan.durationDays * 24 * 60 * 60 * 1000;
  }

  private ensureValidLicenseRecord<T extends { status: LicenseStatus; expireAt: Date | null; product: { productCode: string; status: ProductStatus }; plan: { status: PlanStatus } }>(
    license: T | null,
    productCode: string,
  ): asserts license is T {
    if (!license) {
      throw new AppError(ErrorCode.LICENSE_NOT_FOUND, 'license not found');
    }
    if (license.product.productCode !== productCode) {
      throw new AppError(ErrorCode.PRODUCT_MISMATCH, 'product mismatch');
    }
    if (license.product.status !== ProductStatus.active) {
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
  }
}
