import { FeatureFlags } from './types';

export class FeatureGate {
  constructor(private flags: FeatureFlags = {}) {}

  update(flags: FeatureFlags) {
    this.flags = flags;
  }

  hasFeature(key: string) {
    return this.flags[key] === true;
  }

  getLimit(key: string) {
    const value = this.flags[key];
    return typeof value === 'number' ? value : undefined;
  }

  all() {
    return { ...this.flags };
  }
}
