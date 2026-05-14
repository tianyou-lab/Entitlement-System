import { LicenseCache } from './types';

export class LeaseVerifier {
  constructor(private readonly graceHours = 24) {}

  check(cache: LicenseCache | null) {
    if (!cache?.leaseToken || !cache.leaseExpireAt) {
      return { status: 'missing' as const };
    }
    const expireAt = new Date(cache.leaseExpireAt).getTime();
    if (Number.isNaN(expireAt)) {
      return { status: 'invalid' as const };
    }
    if (expireAt > Date.now()) {
      return { status: 'valid' as const, cache };
    }
    if (expireAt + this.graceHours * 60 * 60 * 1000 > Date.now()) {
      return { status: 'grace' as const, cache };
    }
    return { status: 'expired' as const, cache };
  }
}
