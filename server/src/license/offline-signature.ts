import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify } from 'crypto';
import { HttpStatus } from '@nestjs/common';
import { stableStringify } from '../common/guards/request-signature.guard';
import { ErrorCode } from '../common/error-codes';
import { AppError } from '../common/errors';

const devKeyPair = generateKeyPairSync('ed25519');

export function signOfflinePackage(packageCode: string, payload: Record<string, unknown>) {
  const payloadToSign = offlinePayloadBytes(packageCode, payload);
  const privateKey = process.env.OFFLINE_LICENSE_PRIVATE_KEY
    ? createPrivateKey(normalizePem(process.env.OFFLINE_LICENSE_PRIVATE_KEY))
    : readDevPrivateKey();
  return sign(null, payloadToSign, privateKey).toString('base64url');
}

export function verifyOfflinePackage(packageCode: string, payload: Record<string, unknown>, signature: string) {
  const publicKey = process.env.OFFLINE_LICENSE_PUBLIC_KEY
    ? createPublicKey(normalizePem(process.env.OFFLINE_LICENSE_PUBLIC_KEY))
    : readDevPublicKey();
  return verify(null, offlinePayloadBytes(packageCode, payload), publicKey, Buffer.from(signature, 'base64url'));
}

export function assertOfflineSigningConfigured() {
  if (process.env.NODE_ENV !== 'production') return;
  if (!process.env.OFFLINE_LICENSE_PRIVATE_KEY || !process.env.OFFLINE_LICENSE_PUBLIC_KEY) {
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'offline Ed25519 private/public keys are required in production', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

function offlinePayloadBytes(packageCode: string, payload: Record<string, unknown>) {
  return Buffer.from(`${packageCode}.${stableStringify(payload)}`, 'utf8');
}

function normalizePem(value: string) {
  return value.includes('\\n') ? value.replace(/\\n/g, '\n') : value;
}

function readDevPrivateKey() {
  return devKeyPair.privateKey;
}

function readDevPublicKey() {
  return devKeyPair.publicKey;
}
