import { randomBytes } from 'crypto';
import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ok } from '../../common/response';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { CreateLicenseDto, UpdateLicenseStatusDto } from './licenses.dto';
import { hashLicenseKey } from '../../license/license-key';

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
    const plainLicenseKey = dto.licenseKey ?? this.generateLicenseKey();
    const license = await this.prisma.license.create({
      data: {
        productId: dto.productId,
        planId: dto.planId,
        licenseKeyHash: hashLicenseKey(plainLicenseKey),
        expireAt,
        maxDevicesOverride: dto.maxDevicesOverride,
        featureFlagsOverride: dto.featureFlagsOverride as Prisma.InputJsonValue | undefined,
        notes: dto.notes,
      },
    });
    await this.audit.admin({ targetType: 'license', targetId: license.id, action: 'create', afterData: license });
    return ok({ ...this.publicLicense(license), licenseKey: plainLicenseKey }, 'created');
  }

  @Get()
  async list() {
    const licenses = await this.prisma.license.findMany({ include: { product: true, plan: true }, orderBy: { id: 'desc' } });
    return ok(licenses.map((license) => this.publicLicense(license)));
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    const license = await this.prisma.license.findUnique({ where: { id: Number(id) }, include: { product: true, plan: true, devices: true } });
    return ok(license ? this.publicLicense(license) : null);
  }

  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateLicenseStatusDto) {
    const before = await this.prisma.license.findUnique({ where: { id: Number(id) } });
    const license = await this.prisma.license.update({ where: { id: Number(id) }, data: { status: dto.status } });
    await this.audit.admin({ targetType: 'license', targetId: license.id, action: 'update_status', beforeData: before, afterData: license });
    return ok(this.publicLicense(license));
  }

  @Get(':id/devices')
  async devices(@Param('id') id: string) {
    return ok(await this.prisma.device.findMany({ where: { licenseId: Number(id) }, orderBy: { id: 'desc' } }));
  }

  private generateLicenseKey() {
    return `LIC-${randomBytes(6).toString('hex').toUpperCase()}-${randomBytes(6).toString('hex').toUpperCase()}-${randomBytes(6).toString('hex').toUpperCase()}`;
  }

  private publicLicense<T extends { licenseKeyHash?: string }>(license: T) {
    const { licenseKeyHash: _licenseKeyHash, ...publicLicense } = license;
    return publicLicense;
  }
}
