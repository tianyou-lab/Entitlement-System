import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DeviceDto } from '../license/dto/license.dto';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class RiskService {
  constructor(private readonly prisma: PrismaService) {}

  async inspectActivationAttempt(licenseId: number, device: DeviceDto, ip?: string) {
    const existingDevice = await this.prisma.device.findUnique({ where: { deviceCode: device.deviceCode } });
    if (existingDevice && existingDevice.fingerprintHash !== device.fingerprintHash) {
      await this.createEvent({
        licenseId,
        deviceId: existingDevice.id,
        eventType: 'fingerprint_changed',
        severity: 'high',
        summary: `设备 ${device.deviceCode} 指纹发生变化`,
        details: { previous: existingDevice.fingerprintHash, current: device.fingerprintHash },
      });
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activationCount = await this.prisma.activationLog.count({ where: { licenseId, createdAt: { gte: since } } });
    if (activationCount >= 10) {
      await this.createEvent({ licenseId, eventType: 'activation_frequency', severity: 'high', summary: '单 License 24 小时激活次数超过阈值', details: { activationCount } });
    }

    const logs = await this.prisma.activationLog.findMany({ where: { licenseId, createdAt: { gte: since }, ip: { not: null } }, select: { ip: true } });
    const ipCount = new Set(logs.map((log) => log.ip).filter(Boolean)).size;
    if (ip && ipCount >= 3) {
      await this.createEvent({ licenseId, eventType: 'ip_switching', severity: 'medium', summary: '单 License 多 IP 高频切换', details: { ipCount } });
    }
  }

  async inspectHeartbeat(licenseId: number, deviceId: number, appVersion: string) {
    if (!/^\d+\.\d+\.\d+([-.+][0-9A-Za-z.-]+)?$/.test(appVersion)) {
      await this.createEvent({ licenseId, deviceId, eventType: 'invalid_version', severity: 'low', summary: '异常版本号访问', details: { appVersion } });
    }

    const since = new Date(Date.now() - 60 * 60 * 1000);
    const heartbeatCount = await this.prisma.heartbeatLog.count({ where: { licenseId, deviceId, actionType: 'heartbeat', createdAt: { gte: since } } });
    if (heartbeatCount >= 120) {
      await this.createEvent({ licenseId, deviceId, eventType: 'heartbeat_frequency', severity: 'medium', summary: '心跳频率异常', details: { heartbeatCount } });
    }
  }

  async inspectDeactivate(licenseId: number, deviceId: number) {
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (device && device.unbindCount >= 3) {
      await this.createEvent({ licenseId, deviceId, eventType: 'unbind_frequency', severity: 'high', summary: '单 License 高频解绑', details: { unbindCount: device.unbindCount } });
    }
  }

  private async createEvent(data: { licenseId: number; deviceId?: number; eventType: string; severity: 'low' | 'medium' | 'high'; summary: string; details: Record<string, unknown> }) {
    await this.prisma.riskEvent.create({
      data: {
        licenseId: data.licenseId,
        deviceId: data.deviceId,
        eventType: data.eventType,
        severity: data.severity,
        summary: data.summary,
        details: data.details as Prisma.InputJsonValue,
      },
    });
  }
}
