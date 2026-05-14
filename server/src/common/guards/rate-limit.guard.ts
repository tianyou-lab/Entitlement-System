import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { ErrorCode } from '../error-codes';
import { AppError } from '../errors';

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitService {
  private readonly buckets = new Map<string, RateLimitBucket>();

  hit(key: string, limit = readPositiveInt(process.env.PUBLIC_API_RATE_LIMIT_MAX, 120), windowMs = readPositiveInt(process.env.PUBLIC_API_RATE_LIMIT_WINDOW_MS, 60_000), now = Date.now()) {
    this.cleanup(now);
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    bucket.count += 1;
    return bucket.count <= limit;
  }

  private cleanup(now: number) {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}

@Injectable()
export class PublicApiRateLimitGuard implements CanActivate {
  constructor(private readonly rateLimit: RateLimitService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const key = `${clientIp(request)}:${request.method}:${request.route?.path ?? request.path}`;
    if (!this.rateLimit.hit(key)) {
      throw new AppError(ErrorCode.RATE_LIMITED, 'too many requests', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}

function clientIp(request: Request) {
  const forwardedFor = request.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) return forwardedFor.split(',')[0].trim();
  if (Array.isArray(forwardedFor) && forwardedFor[0]) return forwardedFor[0].split(',')[0].trim();
  return request.ip || request.socket.remoteAddress || 'unknown';
}

function readPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
