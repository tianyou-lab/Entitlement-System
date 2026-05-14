import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ok } from '../../common/response';
import { PrismaService } from '../../database/prisma.service';
import { AdminAuthGuard } from '../auth/admin-auth.guard';

@UseGuards(AdminAuthGuard)
@Controller()
export class LogsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('/admin/activation-logs')
  async activationLogs(@Query('licenseId') licenseId?: string, @Query('resultCode') resultCode?: string) {
    const where: Prisma.ActivationLogWhereInput = {
      licenseId: licenseId ? Number(licenseId) : undefined,
      resultCode,
    };
    return ok(await this.prisma.activationLog.findMany({ where, include: { license: true, device: true }, orderBy: { id: 'desc' }, take: 200 }));
  }

  @Get('/admin/heartbeat-logs')
  async heartbeatLogs(@Query('licenseId') licenseId?: string, @Query('deviceId') deviceId?: string, @Query('actionType') actionType?: string) {
    const where: Prisma.HeartbeatLogWhereInput = {
      licenseId: licenseId ? Number(licenseId) : undefined,
      deviceId: deviceId ? Number(deviceId) : undefined,
      actionType,
    };
    return ok(await this.prisma.heartbeatLog.findMany({ where, include: { license: true, device: true, lease: true }, orderBy: { id: 'desc' }, take: 200 }));
  }

  @Get('/admin/audit-logs')
  async auditLogs(@Query('targetType') targetType?: string, @Query('action') action?: string) {
    const where: Prisma.AuditLogWhereInput = { targetType, action };
    return ok(await this.prisma.auditLog.findMany({ where, orderBy: { id: 'desc' }, take: 200 }));
  }
}
