import { Body, Controller, Delete, Get, HttpStatus, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AppError } from '../../common/errors';
import { ErrorCode } from '../../common/error-codes';
import { ok } from '../../common/response';
import { PrismaService } from '../../database/prisma.service';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { CreateProductDto, UpdateProductDto } from './products.dto';

@UseGuards(AdminAuthGuard)
@Controller('/admin/products')
export class ProductsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async create(@Body() dto: CreateProductDto) {
    return ok(await this.prisma.product.create({ data: dto }), 'created');
  }

  @Get()
  async list() {
    const products = await this.prisma.product.findMany({ orderBy: { id: 'desc' } });
    const signingSecrets = readPublicApiSigningSecrets();
    return ok(products.map((product) => ({
      ...product,
      requestSigningSecrets: signingSecrets
        .filter((item) => item.productCode === product.productCode)
        .map((item) => ({
          keyId: item.keyId,
          productCode: item.productCode,
          appVersion: item.appVersion,
          requestSigningSecret: item.secret,
        })),
    })));
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return ok(await this.prisma.product.update({ where: { id: Number(id) }, data: dto }));
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const productId = Number(id);
    await this.prisma.$transaction(async (tx) => {
      const licenses = await tx.license.findMany({ where: { productId }, select: { id: true } });
      const licenseIds = licenses.map((license) => license.id);
      const devices = await tx.device.findMany({ where: { licenseId: { in: licenseIds } }, select: { id: true } });
      const deviceIds = devices.map((device) => device.id);
      const leases = await tx.lease.findMany({ where: { licenseId: { in: licenseIds } }, select: { id: true } });
      const leaseIds = leases.map((lease) => lease.id);

      await tx.heartbeatLog.deleteMany({ where: { OR: [{ licenseId: { in: licenseIds } }, { deviceId: { in: deviceIds } }, { leaseId: { in: leaseIds } }] } });
      await tx.activationLog.deleteMany({ where: { OR: [{ licenseId: { in: licenseIds } }, { deviceId: { in: deviceIds } }] } });
      await tx.deviceUnbindRequest.deleteMany({ where: { OR: [{ licenseId: { in: licenseIds } }, { deviceId: { in: deviceIds } }] } });
      await tx.riskEvent.deleteMany({ where: { OR: [{ licenseId: { in: licenseIds } }, { deviceId: { in: deviceIds } }] } });
      await tx.offlinePackage.deleteMany({ where: { OR: [{ licenseId: { in: licenseIds } }, { deviceId: { in: deviceIds } }] } });
      await tx.lease.deleteMany({ where: { id: { in: leaseIds } } });
      await tx.device.deleteMany({ where: { id: { in: deviceIds } } });
      await tx.cardKey.deleteMany({ where: { productId } });
      await tx.license.deleteMany({ where: { id: { in: licenseIds } } });
      await tx.versionPolicy.deleteMany({ where: { productId } });
      await tx.protectorAdapter.deleteMany({ where: { productId } });
      await tx.plan.deleteMany({ where: { productId } });
      await tx.product.delete({ where: { id: productId } });
    });
    return ok({ deleted: true }, 'deleted');
  }
}

interface PublicApiSigningSecret {
  keyId?: string;
  productCode?: string;
  appVersion?: string;
  secret: string;
}

function readPublicApiSigningSecrets() {
  const configured = process.env.PUBLIC_API_SIGNING_SECRETS;
  if (!configured) return [] as PublicApiSigningSecret[];

  try {
    const parsed = JSON.parse(configured) as PublicApiSigningSecret[] | Record<string, string>;
    if (Array.isArray(parsed)) return parsed;
    return Object.entries(parsed).map(([keyId, secret]) => ({ keyId, productCode: undefined, appVersion: undefined, secret }));
  } catch {
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'PUBLIC_API_SIGNING_SECRETS is not valid JSON', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
