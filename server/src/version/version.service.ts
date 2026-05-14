import { Injectable } from '@nestjs/common';
import { ErrorCode } from '../common/error-codes';
import { AppError } from '../common/errors';
import { PrismaService } from '../database/prisma.service';
import { ProductService } from '../product/product.service';

@Injectable()
export class VersionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productService: ProductService,
  ) {}

  async getPolicy(productCode: string) {
    const product = await this.productService.getActiveByCode(productCode);
    const policy = await this.prisma.versionPolicy.findFirst({
      where: { productId: product.id },
      orderBy: { id: 'desc' },
    });
    return {
      minSupportedVersion: policy?.minSupportedVersion ?? '1.0.0',
      latestVersion: policy?.latestVersion ?? '1.0.0',
      forceUpgrade: policy?.forceUpgrade ?? false,
      downloadUrl: policy?.downloadUrl ?? null,
      notice: policy?.notice ?? null,
    };
  }

  async ensureAllowed(productCode: string, appVersion: string) {
    const policy = await this.getPolicy(productCode);
    if (policy.forceUpgrade && compareVersion(appVersion, policy.minSupportedVersion) < 0) {
      throw new AppError(ErrorCode.FORCE_UPGRADE_REQUIRED, 'force upgrade required');
    }
    return policy;
  }
}

function compareVersion(left: string, right: string) {
  const leftParts = left.split('.').map((value) => Number(value) || 0);
  const rightParts = right.split('.').map((value) => Number(value) || 0);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
