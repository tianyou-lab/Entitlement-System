import { FeatureGate } from './feature-gate';

describe('FeatureGate', () => {
  it('reads boolean features and numeric limits', () => {
    const gate = new FeatureGate({ publish: true, maxWindowCount: 20, other: 'x' });
    expect(gate.hasFeature('publish')).toBe(true);
    expect(gate.hasFeature('other')).toBe(false);
    expect(gate.getLimit('maxWindowCount')).toBe(20);
    expect(gate.getLimit('other')).toBeUndefined();
  });
});
