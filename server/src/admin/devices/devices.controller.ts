import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { DeviceStatus, Prisma } from '@prisma/client';
import { AuditService } from '../../audit/audit.service';
import { ok } from '../../common/response';
import { PrismaService } from '../../database/prisma.service';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { UpdateDeviceStatusDto } from './devices.dto';

@UseGuards(AdminAuthGuard)
@Controller('/admin/devices')
export class DevicesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(@Query('licenseId') licenseId?: string, @Query('status') status?: DeviceStatus) {
    const where: Prisma.DeviceWhereInput = {
      licenseId: licenseId ? Number(licenseId) : undefined,
      status,
    };
    return ok(await this.prisma.device.findMany({ where, include: { license: true }, orderBy: { id: 'desc' } }));
  }

  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateDeviceStatusDto) {
    const before = await this.prisma.device.findUnique({ where: { id: Number(id) } });
    const device = await this.prisma.device.update({ where: { id: Number(id) }, data: { status: dto.status } });
    await this.audit.admin({ targetType: 'device', targetId: device.id, action: 'update_status', beforeData: before, afterData: device });
    return ok(device);
  }
}
