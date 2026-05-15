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
        requestPayload: sanitizeForAudit(data.requestPayload ?? {}) as Prisma.InputJsonValue,
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
        payload: sanitizeForAudit(data.payload ?? {}) as Prisma.InputJsonValue,
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
        beforeData: sanitizeForAudit(data.beforeData) as Prisma.InputJsonValue,
        afterData: sanitizeForAudit(data.afterData) as Prisma.InputJsonValue,
        ip: data.ip,
      },
    });
  }
}

const SENSITIVE_KEYS = new Set([
  'licenseKey',
  'leaseToken',
  'requestSigningSecret',
  'publicApiSigningSecret',
  'password',
  'passwordHash',
  'oldPassword',
  'newPassword',
  'jwtSecret',
  'leaseSecret',
  'authorization',
]);

function sanitizeForAudit(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((item) => sanitizeForAudit(item));
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      isSensitiveKey(key) ? redactValue(entry) : sanitizeForAudit(entry),
    ]),
  );
}

function isSensitiveKey(key: string) {
  return SENSITIVE_KEYS.has(key) || /token|secret|password|licensekey/i.test(key);
}

function redactValue(value: unknown) {
  if (typeof value !== 'string') return '[REDACTED]';
  if (value.length <= 8) return '[REDACTED]';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}
