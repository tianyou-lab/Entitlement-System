import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async activation(data: { licenseId?: number; deviceId?: number; resultCode: string; message: string; ip?: string; userAgent?: string; requestPayload?: unknown }) {
    await this.prisma.activationLog.create({
      data: {
        licenseId: data.licenseId,
        deviceId: data.deviceId,
        resultCode: data.resultCode,
        message: data.message,
        ip: data.ip,
        userAgent: data.userAgent,
        requestPayload: (data.requestPayload ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async heartbeat(data: { licenseId?: number; deviceId?: number; leaseId?: number; actionType: string; resultCode: string; ip?: string; payload?: unknown }) {
    await this.prisma.heartbeatLog.create({
      data: {
        licenseId: data.licenseId,
        deviceId: data.deviceId,
        leaseId: data.leaseId,
        actionType: data.actionType,
        resultCode: data.resultCode,
        ip: data.ip,
        payload: (data.payload ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async admin(data: { actorId?: number; targetType: string; targetId?: number; action: string; beforeData?: unknown; afterData?: unknown; ip?: string }) {
    await this.prisma.auditLog.create({
      data: {
        actorType: 'admin',
        actorId: data.actorId,
        targetType: data.targetType,
        targetId: data.targetId,
        action: data.action,
        beforeData: data.beforeData as Prisma.InputJsonValue,
        afterData: data.afterData as Prisma.InputJsonValue,
        ip: data.ip,
      },
    });
  }
}
