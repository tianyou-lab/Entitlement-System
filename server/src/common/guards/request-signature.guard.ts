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
    const request = context.switchToHttp().getRequest<Request>();
    const secret = readPublicApiSigningSecret(request);
    if (!secret) return true;

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

    const expected = this.sign(secret, request.method, request.originalUrl || request.url, timestamp, nonce, stableStringify(request.body ?? {}));
    if (!safeEqual(signature, expected)) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'invalid request signature', HttpStatus.UNAUTHORIZED);
    }
    if (!this.nonceReplay.use(`${timestamp}:${nonce}`)) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'replayed request nonce', HttpStatus.UNAUTHORIZED);
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

interface PublicApiSigningSecret {
  keyId?: string;
  productCode?: string;
  appVersion?: string;
  secret: string;
}

function readPublicApiSigningSecret(request: Request) {
  const configured = process.env.PUBLIC_API_SIGNING_SECRETS;
  if (!configured && process.env.NODE_ENV !== 'production') return undefined;
  if (!configured) {
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'PUBLIC_API_SIGNING_SECRETS must be configured', HttpStatus.INTERNAL_SERVER_ERROR);
  }

  const secrets = parseSigningSecrets(configured);
  const keyId = header(request, 'x-entitlement-key-id');
  const productCode = request.method.toUpperCase() === 'GET'
    ? String(request.query?.productCode ?? '') || header(request, 'x-entitlement-product-code') || ''
    : readBodyString(request.body, 'productCode') || header(request, 'x-entitlement-product-code') || '';
  const appVersion = request.method.toUpperCase() === 'GET'
    ? String(request.query?.appVersion ?? '') || header(request, 'x-entitlement-app-version') || ''
    : readBodyString(request.body, 'appVersion') || readBodyString(readBodyObject(request.body, 'device'), 'appVersion') || header(request, 'x-entitlement-app-version') || '';
  const matched = secrets.find((item) =>
    (!keyId || item.keyId === keyId) &&
    item.productCode === productCode &&
    item.appVersion === appVersion,
  );

  if (!matched?.secret || matched.secret.length < 32) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'unknown request signing key', HttpStatus.UNAUTHORIZED);
  }
  return matched.secret;
}

function parseSigningSecrets(configured: string): PublicApiSigningSecret[] {
  try {
    const parsed = JSON.parse(configured) as PublicApiSigningSecret[] | Record<string, string>;
    if (Array.isArray(parsed)) return parsed;
    return Object.entries(parsed).map(([keyId, secret]) => ({ keyId, secret }));
  } catch {
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'PUBLIC_API_SIGNING_SECRETS is not valid JSON', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

function header(request: Request, name: string) {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function readBodyString(body: unknown, key: string) {
  const value = readBodyObject(body, key);
  return typeof value === 'string' ? value : '';
}

function readBodyObject(body: unknown, key: string) {
  if (!body || typeof body !== 'object') return undefined;
  return (body as Record<string, unknown>)[key];
}
