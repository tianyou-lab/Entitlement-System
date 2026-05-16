import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { DeviceStatus, Prisma } from '@prisma/client';
import { AuditService } from '../../audit/audit.service';
import { ok } from '../../common/response';
import { PrismaService } from '../../database/prisma.service';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { UpdateDeviceStatusDto } from './devices.dto';

const DEFAULT_DEVICE_ONLINE_WINDOW_MS = 15 * 60 * 1000;

type DeviceActivity = {
  status: DeviceStatus;
  lastSeenAt: Date | null;
  heartbeatLogs: Array<{ createdAt: Date }>;
};

export function readDeviceOnlineWindowMs() {
  const seconds = Number(process.env.DEVICE_ONLINE_WINDOW_SECONDS);
  if (!Number.isFinite(seconds) || seconds <= 0) return DEFAULT_DEVICE_ONLINE_WINDOW_MS;
  return seconds * 1000;
}

export function isDeviceOnline(device: DeviceActivity, now = new Date(), onlineWindowMs = readDeviceOnlineWindowMs()) {
  const lastActivityAt = device.heartbeatLogs[0]?.createdAt ?? device.lastSeenAt;
  return device.status === DeviceStatus.active && !!lastActivityAt && lastActivityAt.getTime() >= now.getTime() - onlineWindowMs;
}

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
    const devices = await this.prisma.device.findMany({
      where,
      include: {
        license: {
          include: {
            product: true,
            plan: true,
            cardKeys: { select: { cardKey: true }, orderBy: { id: 'desc' }, take: 1 },
          },
        },
        heartbeatLogs: {
          where: { actionType: 'heartbeat' },
          select: { createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { id: 'desc' },
    });

    return ok(devices.map((device) => ({
      ...device,
      cardKey: device.license.cardKeys[0]?.cardKey ?? null,
      onlineStatus: isDeviceOnline(device) ? 'online' : 'offline',
      lastHeartbeatAt: device.heartbeatLogs[0]?.createdAt ?? null,
      heartbeatLogs: undefined,
    })));
  }

  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateDeviceStatusDto) {
    const before = await this.prisma.device.findUnique({ where: { id: Number(id) } });
    const device = await this.prisma.device.update({ where: { id: Number(id) }, data: { status: dto.status } });
    await this.audit.admin({ targetType: 'device', targetId: device.id, action: 'update_status', beforeData: before, afterData: device });
    return ok(device);
  }
}
