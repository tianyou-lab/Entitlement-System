import { Injectable } from '@nestjs/common';
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
}
