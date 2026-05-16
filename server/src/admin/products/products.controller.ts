import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
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
    return ok(await this.prisma.product.findMany({ orderBy: { id: 'desc' } }));
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
