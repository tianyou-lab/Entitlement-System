import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../common/error-codes';
import { AppError } from '../common/errors';

export function hashLicenseKey(licenseKey: string) {
  return createHmac('sha256', readLicenseKeyHashSecret()).update(normalizeLicenseKey(licenseKey)).digest('base64url');
}

export function legacyHashLicenseKey(licenseKey: string) {
  return createHash('sha256').update(normalizeLicenseKey(licenseKey)).digest('hex');
}

export function licenseKeyMatches(licenseKey: string, licenseKeyHash: string) {
  const actual = Buffer.from(hashLicenseKey(licenseKey));
  const expected = Buffer.from(licenseKeyHash);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function normalizeLicenseKey(licenseKey: string) {
  return licenseKey.trim().toUpperCase();
}

function readLicenseKeyHashSecret() {
  const secret = process.env.LICENSE_KEY_HASH_SECRET;
  if (!secret && process.env.NODE_ENV !== 'production') {
    return 'dev-license-key-hash-secret-change-in-production';
  }
  if (!secret || secret.length < 32) {
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'LICENSE_KEY_HASH_SECRET must be at least 32 characters', HttpStatus.INTERNAL_SERVER_ERROR);
  }
  return secret;
}
