import { createHmac } from 'crypto';
import { ExecutionContext } from '@nestjs/common';
import { ErrorCode } from '../error-codes';
import { NonceReplayService, RequestSignatureGuard, stableStringify } from './request-signature.guard';

function contextFor(request: unknown) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}

function sign(secret: string, method: string, path: string, timestamp: string, nonce: string, body: unknown) {
  return createHmac('sha256', secret)
    .update([method.toUpperCase(), path, timestamp, nonce, stableStringify(body)].join('\n'))
    .digest('base64url');
}

describe('RequestSignatureGuard', () => {
  const secret = 'test-public-api-signing-secret-32chars';
  const productCode = 'demo';
  const appVersion = '1.0.50';

  beforeEach(() => {
    process.env.PUBLIC_API_SIGNING_SECRETS = JSON.stringify([{ productCode, appVersion, secret }]);
  });

  afterEach(() => {
    delete process.env.PUBLIC_API_SIGNING_SECRETS;
    delete process.env.NODE_ENV;
  });

  it('does not consume nonce before signature validation', () => {
    const nonceReplay = new NonceReplayService();
    const guard = new RequestSignatureGuard(nonceReplay);
    const timestamp = String(Date.now());
    const nonce = 'nonce-1';
    const body = { productCode, appVersion };
    const request = {
      method: 'POST',
      originalUrl: '/api/v1/license/verify',
      body,
      headers: {
        'x-entitlement-timestamp': timestamp,
        'x-entitlement-nonce': nonce,
        'x-entitlement-signature': 'invalid',
      },
    };

    expect(() => guard.canActivate(contextFor(request))).toThrow(expect.objectContaining({ code: ErrorCode.UNAUTHORIZED }));

    request.headers['x-entitlement-signature'] = sign(secret, request.method, request.originalUrl, timestamp, nonce, body);
    expect(guard.canActivate(contextFor(request))).toBe(true);
  });

  it('rejects replayed nonce after a valid request', () => {
    const nonceReplay = new NonceReplayService();
    const guard = new RequestSignatureGuard(nonceReplay);
    const timestamp = String(Date.now());
    const nonce = 'nonce-2';
    const body = { productCode, appVersion };
    const request = {
      method: 'POST',
      originalUrl: '/api/v1/license/verify',
      body,
      headers: {
        'x-entitlement-timestamp': timestamp,
        'x-entitlement-nonce': nonce,
        'x-entitlement-signature': sign(secret, 'POST', '/api/v1/license/verify', timestamp, nonce, body),
      },
    };

    expect(guard.canActivate(contextFor(request))).toBe(true);
    expect(() => guard.canActivate(contextFor(request))).toThrow(expect.objectContaining({ code: ErrorCode.UNAUTHORIZED }));
  });

  it('requires exact product and app version match', () => {
    const guard = new RequestSignatureGuard(new NonceReplayService());
    const timestamp = String(Date.now());
    const nonce = 'nonce-3';
    const body = { productCode };
    const request = {
      method: 'POST',
      originalUrl: '/api/v1/license/verify',
      body,
      headers: {
        'x-entitlement-timestamp': timestamp,
        'x-entitlement-nonce': nonce,
        'x-entitlement-signature': sign(secret, 'POST', '/api/v1/license/verify', timestamp, nonce, body),
      },
    };

    expect(() => guard.canActivate(contextFor(request))).toThrow(expect.objectContaining({ code: ErrorCode.UNAUTHORIZED }));
  });
});
