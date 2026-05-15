import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { LeaseStatus } from '@prisma/client';
import { ErrorCode } from '../common/error-codes';
import { AppError } from '../common/errors';
import { PrismaService } from '../database/prisma.service';

interface LeasePayload {
  jti: string;
  licenseId: number;
  deviceId: number;
  iat: number;
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
      iat: issuedAt.getTime(),
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
    if (!encodedPayload || !signature || !safeEqual(signature, this.sign(encodedPayload))) {
      throw new AppError(ErrorCode.LEASE_INVALID, 'lease invalid');
    }
    try {
      const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as Partial<LeasePayload>;
      if (!payload.jti || !Number.isInteger(payload.licenseId) || !Number.isInteger(payload.deviceId) || !Number.isFinite(payload.exp)) {
        throw new Error('invalid lease payload');
      }
      return payload as LeasePayload;
    } catch {
      throw new AppError(ErrorCode.LEASE_INVALID, 'lease invalid');
    }
  }

  private sign(value: string) {
    return createHmac('sha256', readLeaseSecret()).update(value).digest('base64url');
  }

  private base64Url(value: string) {
    return Buffer.from(value).toString('base64url');
  }
}

function readLeaseSecret() {
  const secret = process.env.LEASE_SECRET;
  if (!secret && process.env.NODE_ENV !== 'production') return 'dev-lease-secret';
  if (!secret || secret.length < 32) {
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'LEASE_SECRET must be at least 32 characters', HttpStatus.INTERNAL_SERVER_ERROR);
  }
  return secret;
}

function safeEqual(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}
