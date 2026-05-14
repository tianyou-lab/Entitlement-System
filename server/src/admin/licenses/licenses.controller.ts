import { randomBytes } from 'crypto';
import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ok } from '../../common/response';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { CreateLicenseDto, UpdateLicenseStatusDto } from './licenses.dto';

@UseGuards(AdminAuthGuard)
@Controller('/admin/licenses')
export class LicensesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Post()
  async create(@Body() dto: CreateLicenseDto) {
    const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
    const expireAt = dto.expireAt ? new Date(dto.expireAt) : new Date(Date.now() + (plan?.durationDays ?? 365) * 24 * 60 * 60 * 1000);
    const license = await this.prisma.license.create({
      data: {
        productId: dto.productId,
        planId: dto.planId,
        licenseKey: dto.licenseKey ?? this.generateLicenseKey(),
        expireAt,
        maxDevicesOverride: dto.maxDevicesOverride,
        featureFlagsOverride: dto.featureFlagsOverride as Prisma.InputJsonValue | undefined,
        notes: dto.notes,
      },
    });
    await this.audit.admin({ targetType: 'license', targetId: license.id, action: 'create', afterData: license });
    return ok(license, 'created');
  }

  @Get()
  async list() {
    return ok(await this.prisma.license.findMany({ include: { product: true, plan: true }, orderBy: { id: 'desc' } }));
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    return ok(await this.prisma.license.findUnique({ where: { id: Number(id) }, include: { product: true, plan: true, devices: true } }));
  }

  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateLicenseStatusDto) {
    const before = await this.prisma.license.findUnique({ where: { id: Number(id) } });
    const license = await this.prisma.license.update({ where: { id: Number(id) }, data: { status: dto.status } });
    await this.audit.admin({ targetType: 'license', targetId: license.id, action: 'update_status', beforeData: before, afterData: license });
    return ok(license);
  }

  @Get(':id/devices')
  async devices(@Param('id') id: string) {
    return ok(await this.prisma.device.findMany({ where: { licenseId: Number(id) }, orderBy: { id: 'desc' } }));
  }

  private generateLicenseKey() {
    return `LIC-${randomBytes(3).toString('hex').toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;
  }
}
