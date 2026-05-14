import { createHmac, randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { LeaseStatus } from '@prisma/client';
import { ErrorCode } from '../common/error-codes';
import { AppError } from '../common/errors';
import { PrismaService } from '../database/prisma.service';

interface LeasePayload {
  jti: string;
  licenseId: number;
  deviceId: number;
  exp: number;
}

@Injectable()
export class LeaseService {
  constructor(private readonly prisma: PrismaService) {}

  async issue(licenseId: number, deviceId: number, clientVersion: string) {
    const ttlMinutes = process.env.LEASE_TTL_MINUTES ? Number(process.env.LEASE_TTL_MINUTES) : 120;
    const issuedAt = new Date();
    const expireAt = new Date(issuedAt.getTime() + ttlMinutes * 60 * 1000);
    const payload: LeasePayload = {
      jti: randomUUID(),
      licenseId,
      deviceId,
      exp: expireAt.getTime(),
    };
    const encodedPayload = this.base64Url(JSON.stringify(payload));
    const signature = this.sign(encodedPayload);
    const leaseToken = `${encodedPayload}.${signature}`;

    const lease = await this.prisma.lease.create({
      data: {
        licenseId,
        deviceId,
        leaseTokenId: payload.jti,
        issuedAt,
        expireAt,
        nonce: randomUUID(),
        status: LeaseStatus.active,
        clientVersion,
        signature,
      },
    });

    return { lease, leaseToken, leaseExpireAt: expireAt };
  }

  async validate(leaseToken: string, deviceCode: string) {
    const payload = this.parseToken(leaseToken);
    const lease = await this.prisma.lease.findUnique({
      where: { leaseTokenId: payload.jti },
      include: { device: true, license: true },
    });

    if (!lease || lease.status !== LeaseStatus.active) {
      throw new AppError(ErrorCode.LEASE_INVALID, 'lease invalid');
    }
    if (lease.device.deviceCode !== deviceCode || lease.deviceId !== payload.deviceId || lease.licenseId !== payload.licenseId) {
      throw new AppError(ErrorCode.LEASE_INVALID, 'lease invalid');
    }
    if (lease.expireAt.getTime() <= Date.now() || payload.exp <= Date.now()) {
      await this.prisma.lease.update({ where: { id: lease.id }, data: { status: LeaseStatus.expired } });
      throw new AppError(ErrorCode.LEASE_EXPIRED, 'lease expired');
    }

    return lease;
  }

  async revoke(leaseId: number) {
    return this.prisma.lease.update({ where: { id: leaseId }, data: { status: LeaseStatus.revoked } });
  }

  async revokeActiveByDevice(deviceId: number) {
    return this.prisma.lease.updateMany({ where: { deviceId, status: LeaseStatus.active }, data: { status: LeaseStatus.revoked } });
  }

  private parseToken(token: string): LeasePayload {
    const [encodedPayload, signature] = token.split('.');
    if (!encodedPayload || !signature || this.sign(encodedPayload) !== signature) {
      throw new AppError(ErrorCode.LEASE_INVALID, 'lease invalid');
    }
    try {
      return JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as LeasePayload;
    } catch {
      throw new AppError(ErrorCode.LEASE_INVALID, 'lease invalid');
    }
  }

  private sign(value: string) {
    return createHmac('sha256', process.env.LEASE_SECRET ?? 'dev-lease-secret').update(value).digest('base64url');
  }

  private base64Url(value: string) {
    return Buffer.from(value).toString('base64url');
  }
}
