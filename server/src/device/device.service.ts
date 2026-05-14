import { Injectable } from '@nestjs/common';
import { DeviceStatus, Prisma } from '@prisma/client';
import { ErrorCode } from '../common/error-codes';
import { AppError } from '../common/errors';
import { PrismaService } from '../database/prisma.service';
import { DeviceDto } from '../license/dto/license.dto';

@Injectable()
export class DeviceService {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveByCode(deviceCode: string) {
    const device = await this.prisma.device.findUnique({ where: { deviceCode } });
    if (!device || device.status === DeviceStatus.removed) {
      throw new AppError(ErrorCode.DEVICE_REMOVED, 'device removed');
    }
    if (device.status === DeviceStatus.banned) {
      throw new AppError(ErrorCode.DEVICE_REMOVED, 'device banned');
    }
    return device;
  }

  async getOrCreateDevice(licenseId: number, maxDevices: number, dto: DeviceDto, ip?: string) {
    const existing = await this.prisma.device.findUnique({ where: { deviceCode: dto.deviceCode } });
    if (existing) {
      if (existing.licenseId !== licenseId || existing.status === DeviceStatus.removed) {
        throw new AppError(ErrorCode.DEVICE_REMOVED, 'device removed');
      }
      if (existing.status === DeviceStatus.banned) {
        throw new AppError(ErrorCode.DEVICE_REMOVED, 'device banned');
      }
      return this.prisma.device.update({
        where: { id: existing.id },
        data: { lastSeenAt: new Date(), appVersion: dto.appVersion, lastIp: ip },
      });
    }

    const activeCount = await this.prisma.device.count({ where: { licenseId, status: DeviceStatus.active } });
    if (activeCount >= maxDevices) {
      throw new AppError(ErrorCode.DEVICE_LIMIT_REACHED, 'device limit reached');
    }

    return this.prisma.device.create({
      data: {
        licenseId,
        deviceCode: dto.deviceCode,
        fingerprintHash: dto.fingerprintHash,
        deviceName: dto.deviceName,
        osType: dto.osType,
        osVersion: dto.osVersion,
        appVersion: dto.appVersion,
        hardwareSummary: (dto.hardwareSummary ?? {}) as Prisma.InputJsonValue,
        lastIp: ip,
      },
    });
  }

  async touch(deviceId: number, appVersion: string, ip?: string) {
    return this.prisma.device.update({
      where: { id: deviceId },
      data: { lastSeenAt: new Date(), appVersion, lastIp: ip },
    });
  }

  async remove(deviceCode: string) {
    return this.prisma.device.update({
      where: { deviceCode },
      data: { status: DeviceStatus.removed, unbindCount: { increment: 1 } },
    });
  }
}
