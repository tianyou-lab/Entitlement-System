import { Injectable } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { ErrorCode } from '../common/error-codes';
import { AppError } from '../common/errors';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveByCode(productCode: string) {
    const product = await this.prisma.product.findUnique({ where: { productCode } });
    if (!product || product.status !== ProductStatus.active) {
      throw new AppError(ErrorCode.PRODUCT_MISMATCH, 'product mismatch');
    }
    return product;
  }
}
