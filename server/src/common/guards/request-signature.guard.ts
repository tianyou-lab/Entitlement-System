import { createHmac, timingSafeEqual } from 'crypto';
import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { ErrorCode } from '../error-codes';
import { AppError } from '../errors';

@Injectable()
export class NonceReplayService {
  private readonly seen = new Map<string, number>();

  use(nonce: string, now = Date.now()) {
    for (const [key, expiresAt] of this.seen) {
      if (expiresAt <= now) this.seen.delete(key);
    }
    if (this.seen.has(nonce)) return false;
    this.seen.set(nonce, now + 5 * 60 * 1000);
    return true;
  }
}

@Injectable()
export class RequestSignatureGuard implements CanActivate {
  constructor(private readonly nonceReplay: NonceReplayService) {}

  canActivate(context: ExecutionContext) {
    const secret = process.env.PUBLIC_API_SIGNING_SECRET;
    if (!secret) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const timestamp = this.header(request, 'x-entitlement-timestamp');
    const nonce = this.header(request, 'x-entitlement-nonce');
    const signature = this.header(request, 'x-entitlement-signature');
    if (!timestamp || !nonce || !signature) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'missing request signature', HttpStatus.UNAUTHORIZED);
    }

    const timestampMs = Number(timestamp);
    if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'request signature expired', HttpStatus.UNAUTHORIZED);
    }
    if (!this.nonceReplay.use(nonce)) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'replayed request nonce', HttpStatus.UNAUTHORIZED);
    }

    const expected = this.sign(secret, request.method, request.originalUrl || request.url, timestamp, nonce, stableStringify(request.body ?? {}));
    if (!safeEqual(signature, expected)) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'invalid request signature', HttpStatus.UNAUTHORIZED);
    }
    return true;
  }

  private header(request: Request, name: string) {
    const value = request.headers[name];
    return Array.isArray(value) ? value[0] : value;
  }

  private sign(secret: string, method: string, path: string, timestamp: string, nonce: string, body: string) {
    return createHmac('sha256', secret).update([method.toUpperCase(), path, timestamp, nonce, body].join('\n')).digest('base64url');
  }
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`).join(',')}}`;
}

function safeEqual(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}
