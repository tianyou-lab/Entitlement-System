import { RiskService } from './risk.service';

function createService(overrides: Record<string, unknown> = {}) {
  const riskEvents: unknown[] = [];
  const prisma = {
    device: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    activationLog: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    heartbeatLog: {
      count: jest.fn().mockResolvedValue(0),
    },
    riskEvent: {
      create: jest.fn(({ data }) => {
        riskEvents.push(data);
        return Promise.resolve(data);
      }),
    },
    ...overrides,
  };
  return { service: new RiskService(prisma as any), prisma, riskEvents };
}

describe('RiskService', () => {
  it('creates a high severity event for frequent activation', async () => {
    const { service, riskEvents } = createService({ activationLog: { count: jest.fn().mockResolvedValue(10), findMany: jest.fn().mockResolvedValue([]) } });

    await service.inspectActivationAttempt(1, { deviceCode: 'dev-1', fingerprintHash: 'hash-1', deviceName: 'PC', osType: 'linux', osVersion: '6.12', appVersion: '1.0.0' });

    expect(riskEvents).toContainEqual(expect.objectContaining({ licenseId: 1, eventType: 'activation_frequency', severity: 'high' }));
  });

  it('creates a risk event when device fingerprint changes', async () => {
    const { service, riskEvents } = createService({
      device: { findUnique: jest.fn().mockResolvedValue({ id: 7, deviceCode: 'dev-1', fingerprintHash: 'old-hash', unbindCount: 0 }) },
    });

    await service.inspectActivationAttempt(1, { deviceCode: 'dev-1', fingerprintHash: 'new-hash', deviceName: 'PC', osType: 'linux', osVersion: '6.12', appVersion: '1.0.0' });

    expect(riskEvents).toContainEqual(expect.objectContaining({ licenseId: 1, deviceId: 7, eventType: 'fingerprint_changed', severity: 'high' }));
  });

  it('creates a risk event for invalid app versions', async () => {
    const { service, riskEvents } = createService();

    await service.inspectHeartbeat(1, 2, 'nightly');

    expect(riskEvents).toContainEqual(expect.objectContaining({ licenseId: 1, deviceId: 2, eventType: 'invalid_version', severity: 'low' }));
  });
});
