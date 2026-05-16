import { createHmac } from 'crypto';
import { hashLicenseKey } from '../src/license/license-key';
import { signOfflinePackage } from '../src/license/offline-signature';
import { INestApplication, HttpStatus, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DeviceStatus, LeaseStatus, LicenseStatus, PlanStatus, ProductStatus } from '@prisma/client';
import * as request from 'supertest';
import { AuditService } from '../src/audit/audit.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PublicApiRateLimitGuard, RateLimitService } from '../src/common/guards/rate-limit.guard';
import { NonceReplayService, RequestSignatureGuard, stableStringify } from '../src/common/guards/request-signature.guard';
import { ErrorCode } from '../src/common/error-codes';
import { PrismaService } from '../src/database/prisma.service';
import { DeviceService } from '../src/device/device.service';
import { LeaseService } from '../src/lease/lease.service';
import { P2AdminController, PublicDeviceUnbindController, PublicOfflinePackageController } from '../src/admin/p2/p2.controller';
import { AdminAuthGuard } from '../src/admin/auth/admin-auth.guard';
import { ActivationService } from '../src/license/activation.service';
import { LicenseController } from '../src/license/license.controller';
import { LicenseService } from '../src/license/license.service';
import { VerifyHeartbeatService } from '../src/license/verify-heartbeat.service';
import { PlanService } from '../src/plan/plan.service';
import { ProductService } from '../src/product/product.service';
import { RiskService } from '../src/risk/risk.service';
import { VersionController } from '../src/version/version.controller';
import { VersionService } from '../src/version/version.service';

const devicePayload = (deviceCode: string) => ({
  deviceCode,
  fingerprintHash: `${deviceCode}-hash`,
  deviceName: `${deviceCode}-pc`,
  osType: 'linux',
  osVersion: '6.12',
  appVersion: '1.0.0',
  hardwareSummary: { cpu: 'test' },
});

function createPrismaStub() {
  const product = {
    id: 1,
    productCode: 'demo_app',
    name: 'Demo App',
    status: ProductStatus.active,
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const plan = {
    id: 1,
    productId: product.id,
    planCode: 'basic',
    name: 'Basic Plan',
    status: PlanStatus.active,
    durationDays: 365,
    maxDevices: 1,
    maxConcurrency: 1,
    graceHours: 24,
    featureFlags: { publish: true, maxWindowCount: 20 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const license = {
    id: 1,
    licenseKeyHash: hashLicenseKey('DEMO-AAAA-BBBB-CCCC'),
    productId: product.id,
    planId: plan.id,
    status: LicenseStatus.active as LicenseStatus,
    customerId: null,
    channelId: null,
    issuedAt: new Date(),
    activateAt: null as Date | null,
    expireAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    maxDevicesOverride: null,
    maxConcurrencyOverride: null,
    featureFlagsOverride: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    product,
    plan,
  };
  const policy = {
    id: 1,
    productId: product.id,
    minSupportedVersion: '1.0.0',
    latestVersion: '1.0.0',
    forceUpgrade: false,
    downloadUrl: null,
    notice: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const devices: any[] = [];
  const leases: any[] = [];
  const activationLogs: any[] = [];
  const heartbeatLogs: any[] = [];
  const auditLogs: any[] = [];
  const riskEvents: any[] = [];
  const deviceUnbindRequests: any[] = [];
  const offlinePayload = {
    licenseId: license.id,
    productCode: product.productCode,
    planCode: plan.planCode,
    expireAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    featureFlags: plan.featureFlags,
  };
  const offlinePackage = {
    id: 1,
    tenantId: null,
    licenseId: license.id,
    deviceId: null,
    packageCode: 'OFFLINE-AAAA-BBBB',
    payload: offlinePayload,
    signature: signOfflinePackage('OFFLINE-AAAA-BBBB', offlinePayload),
    status: 'active',
    expireAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    license,
    device: null,
  };

  const prisma = {
    product: {
      findUnique: jest.fn(({ where }) => (where.productCode === product.productCode ? Promise.resolve(product) : Promise.resolve(null))),
    },
    license: {
      findUnique: jest.fn(({ where, include }) => {
        const found = where.licenseKeyHash === license.licenseKeyHash || where.id === license.id ? license : null;
        if (!found) return Promise.resolve(null);
        return Promise.resolve(include ? { ...found, product, plan } : found);
      }),
      update: jest.fn(({ where, data }) => {
        if (where.id !== license.id) return Promise.resolve(null);
        Object.assign(license, data, { updatedAt: new Date() });
        return Promise.resolve({ ...license, product, plan });
      }),
    },
    device: {
      findUnique: jest.fn(({ where, include }) => {
        const device = devices.find((item) => item.deviceCode === where.deviceCode || item.id === where.id) ?? null;
        if (!device) return Promise.resolve(null);
        return Promise.resolve(include?.license ? { ...device, license } : device);
      }),
      count: jest.fn(({ where }) => Promise.resolve(devices.filter((device) => device.licenseId === where.licenseId && device.status === where.status).length)),
      create: jest.fn(({ data }) => {
        const device = {
          id: devices.length + 1,
          ...data,
          status: DeviceStatus.active,
          firstActivateAt: new Date(),
          lastSeenAt: new Date(),
          unbindCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        devices.push(device);
        return Promise.resolve(device);
      }),
      update: jest.fn(({ where, data }) => {
        const device = devices.find((item) => item.id === where.id || item.deviceCode === where.deviceCode);
        if (data.unbindCount?.increment) {
          device.unbindCount += data.unbindCount.increment;
          delete data.unbindCount;
        }
        Object.assign(device, data, { updatedAt: new Date() });
        return Promise.resolve(device);
      }),
    },
    lease: {
      create: jest.fn(({ data }) => {
        const lease = {
          id: leases.length + 1,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        leases.push(lease);
        return Promise.resolve(lease);
      }),
      findUnique: jest.fn(({ where }) => {
        const lease = leases.find((item) => item.leaseTokenId === where.leaseTokenId);
        if (!lease) return Promise.resolve(null);
        return Promise.resolve({ ...lease, device: devices.find((device) => device.id === lease.deviceId), license });
      }),
      update: jest.fn(({ where, data }) => {
        const lease = leases.find((item) => item.id === where.id);
        Object.assign(lease, data, { updatedAt: new Date() });
        return Promise.resolve(lease);
      }),
      updateMany: jest.fn(({ where, data }) => {
        const matched = leases.filter((item) => item.deviceId === where.deviceId && item.status === where.status);
        matched.forEach((item) => Object.assign(item, data, { updatedAt: new Date() }));
        return Promise.resolve({ count: matched.length });
      }),
    },
    versionPolicy: {
      findFirst: jest.fn(({ where }) => Promise.resolve(where.productId === product.id ? policy : null)),
    },
    activationLog: {
      count: jest.fn(({ where }) => Promise.resolve(activationLogs.filter((log) => log.licenseId === where.licenseId).length)),
      findMany: jest.fn(({ where }) => Promise.resolve(activationLogs.filter((log) => log.licenseId === where.licenseId && log.ip).map((log) => ({ ip: log.ip })))),
      create: jest.fn(({ data }) => {
        activationLogs.push({ ...data, createdAt: new Date() });
        return Promise.resolve(data);
      }),
    },
    heartbeatLog: {
      count: jest.fn(({ where }) => Promise.resolve(heartbeatLogs.filter((log) => log.licenseId === where.licenseId && log.deviceId === where.deviceId && log.actionType === where.actionType).length)),
      create: jest.fn(({ data }) => {
        heartbeatLogs.push({ ...data, createdAt: new Date() });
        return Promise.resolve(data);
      }),
    },
    riskEvent: {
      create: jest.fn(({ data }) => {
        const riskEvent = {
          id: riskEvents.length + 1,
          tenantId: null,
          licenseId: null,
          deviceId: null,
          severity: 'low',
          status: 'open',
          count: 1,
          details: {},
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        riskEvents.push(riskEvent);
        return Promise.resolve(riskEvent);
      }),
      findUnique: jest.fn(({ where }) => Promise.resolve(riskEvents.find((item) => item.id === where.id) ?? null)),
      findMany: jest.fn(() => Promise.resolve(riskEvents)),
      update: jest.fn(({ where, data }) => {
        const riskEvent = riskEvents.find((item) => item.id === where.id);
        Object.assign(riskEvent, data, { updatedAt: new Date() });
        return Promise.resolve(riskEvent);
      }),
    },
    offlinePackage: {
      findUnique: jest.fn(({ where }) => Promise.resolve(where.packageCode === offlinePackage.packageCode ? offlinePackage : null)),
      findMany: jest.fn(() => Promise.resolve([offlinePackage])),
      update: jest.fn(({ where, data }) => {
        if (where.id !== offlinePackage.id) return Promise.resolve(null);
        Object.assign(offlinePackage, data, { updatedAt: new Date() });
        return Promise.resolve(offlinePackage);
      }),
    },
    deviceUnbindRequest: {
      create: jest.fn(({ data }) => {
        const unbindRequest = { id: deviceUnbindRequests.length + 1, ...data, status: 'pending', createdAt: new Date(), updatedAt: new Date() };
        deviceUnbindRequests.push(unbindRequest);
        return Promise.resolve(unbindRequest);
      }),
      findUnique: jest.fn(({ where }) => Promise.resolve(deviceUnbindRequests.find((item) => item.id === where.id) ?? null)),
      findMany: jest.fn(() => Promise.resolve(deviceUnbindRequests)),
      update: jest.fn(({ where, data }) => {
        const unbindRequest = deviceUnbindRequests.find((item) => item.id === where.id);
        Object.assign(unbindRequest, data, { updatedAt: new Date() });
        return Promise.resolve(unbindRequest);
      }),
    },
    auditLog: {
      create: jest.fn(({ data }) => {
        const auditLog = { id: auditLogs.length + 1, ...data, createdAt: new Date() };
        auditLogs.push(auditLog);
        return Promise.resolve(auditLog);
      }),
    },
  };

  return { prisma, license, devices, leases, policy, offlinePackage, riskEvents, deviceUnbindRequests, auditLogs };
}

describe('License API (e2e)', () => {
  let app: INestApplication;
  let store: ReturnType<typeof createPrismaStub>;
  let previousSigningSecrets: string | undefined;

  beforeEach(async () => {
    previousSigningSecrets = process.env.PUBLIC_API_SIGNING_SECRETS;
    process.env.PUBLIC_API_SIGNING_SECRETS = JSON.stringify([
      { productCode: 'demo_app', appVersion: '1.0.0', secret: 'ci-public-api-signing-secret-32-characters' },
    ]);
    store = createPrismaStub();
    const moduleRef = await Test.createTestingModule({
      controllers: [LicenseController, VersionController, P2AdminController, PublicOfflinePackageController, PublicDeviceUnbindController],
      providers: [
        ProductService,
        PlanService,
        LicenseService,
        DeviceService,
        LeaseService,
        VersionService,
        AuditService,
        RiskService,
        RateLimitService,
        PublicApiRateLimitGuard,
        NonceReplayService,
        RequestSignatureGuard,
        ActivationService,
        VerifyHeartbeatService,
        { provide: PrismaService, useValue: store.prisma },
      ],
    })
      .overrideGuard(AdminAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    if (previousSigningSecrets === undefined) delete process.env.PUBLIC_API_SIGNING_SECRETS;
    else process.env.PUBLIC_API_SIGNING_SECRETS = previousSigningSecrets;
  });

  function signedPost(path: string, body: Record<string, unknown>) {
    const timestamp = Date.now().toString();
    const nonce = `${timestamp}-${Math.random()}`;
    const secret = 'ci-public-api-signing-secret-32-characters';
    const signature = createHmac('sha256', secret).update(['POST', path, timestamp, nonce, stableStringify(body)].join('\n')).digest('base64url');
    return request(app.getHttpServer())
      .post(path)
      .set('x-entitlement-timestamp', timestamp)
      .set('x-entitlement-nonce', nonce)
      .set('x-entitlement-product-code', 'demo_app')
      .set('x-entitlement-app-version', '1.0.0')
      .set('x-entitlement-signature', signature)
      .send(body);
  }

  function signedGet(path: string) {
    const timestamp = Date.now().toString();
    const nonce = `${timestamp}-${Math.random()}`;
    const secret = 'ci-public-api-signing-secret-32-characters';
    const signature = createHmac('sha256', secret).update(['GET', path, timestamp, nonce, stableStringify({})].join('\n')).digest('base64url');
    return request(app.getHttpServer())
      .get(path)
      .set('x-entitlement-timestamp', timestamp)
      .set('x-entitlement-nonce', nonce)
      .set('x-entitlement-product-code', 'demo_app')
      .set('x-entitlement-app-version', '1.0.0')
      .set('x-entitlement-signature', signature);
  }

  async function activate(deviceCode = 'dev-1') {
    const res = await signedPost('/api/v1/license/activate', { productCode: 'demo_app', licenseKey: 'DEMO-AAAA-BBBB-CCCC', device: devicePayload(deviceCode) })
      .expect(HttpStatus.CREATED);
    return res.body.data.leaseToken as string;
  }

  it('activates, verifies, heartbeats, and deactivates a device', async () => {
    const leaseToken = await activate();

    await signedPost('/api/v1/license/verify', { productCode: 'demo_app', leaseToken, deviceCode: 'dev-1', appVersion: '1.0.0' })
      .expect(HttpStatus.CREATED)
      .expect(({ body }) => {
        expect(body).toMatchObject({ code: ErrorCode.OK, message: 'valid', data: { licenseStatus: LicenseStatus.active } });
      });

    const heartbeat = await signedPost('/api/v1/license/heartbeat', { productCode: 'demo_app', leaseToken, deviceCode: 'dev-1', appVersion: '1.0.0' })
      .expect(HttpStatus.CREATED);
    expect(heartbeat.body).toMatchObject({ code: ErrorCode.OK, message: 'refreshed' });
    expect(heartbeat.body.data.leaseToken).not.toEqual(leaseToken);

    await signedPost('/api/v1/license/deactivate', { productCode: 'demo_app', licenseKey: 'DEMO-AAAA-BBBB-CCCC', deviceCode: 'dev-1', appVersion: '1.0.0' })
      .expect(HttpStatus.CREATED)
      .expect(({ body }) => {
        expect(body).toMatchObject({ code: ErrorCode.OK, message: 'device removed', data: null });
      });

    expect(store.devices[0].status).toBe(DeviceStatus.removed);
    expect(store.leases.every((lease) => lease.status !== LeaseStatus.active)).toBe(true);
  });

  it('rejects verify when the license is banned after activation', async () => {
    const leaseToken = await activate();
    store.license.status = LicenseStatus.banned;

    await signedPost('/api/v1/license/verify', { productCode: 'demo_app', leaseToken, deviceCode: 'dev-1', appVersion: '1.0.0' })
      .expect(HttpStatus.FORBIDDEN)
      .expect(({ body }) => {
        expect(body).toMatchObject({ code: ErrorCode.LICENSE_BANNED, message: 'license banned', data: null });
      });
  });

  it('rejects verify when force upgrade is required', async () => {
    const leaseToken = await activate();
    store.policy.minSupportedVersion = '2.0.0';
    store.policy.forceUpgrade = true;

    await signedPost('/api/v1/license/verify', { productCode: 'demo_app', leaseToken, deviceCode: 'dev-1', appVersion: '1.0.0' })
      .expect(HttpStatus.BAD_REQUEST)
      .expect(({ body }) => {
        expect(body).toMatchObject({ code: ErrorCode.FORCE_UPGRADE_REQUIRED, message: 'force upgrade required', data: null });
      });
  });

  it('rejects activation when the active device limit is reached', async () => {
    await activate('dev-1');

    await signedPost('/api/v1/license/activate', { productCode: 'demo_app', licenseKey: 'DEMO-AAAA-BBBB-CCCC', device: devicePayload('dev-2') })
      .expect(HttpStatus.BAD_REQUEST)
      .expect(({ body }) => {
        expect(body).toMatchObject({ code: ErrorCode.DEVICE_LIMIT_REACHED, message: 'device limit reached', data: null });
      });
  });

  it('rate limits public license requests', async () => {
    const previousLimit = process.env.PUBLIC_API_RATE_LIMIT_MAX;
    const previousWindow = process.env.PUBLIC_API_RATE_LIMIT_WINDOW_MS;
    process.env.PUBLIC_API_RATE_LIMIT_MAX = '1';
    process.env.PUBLIC_API_RATE_LIMIT_WINDOW_MS = '60000';
    try {
      await signedPost('/api/v1/license/activate', { productCode: 'demo_app', licenseKey: 'DEMO-AAAA-BBBB-CCCC', device: devicePayload('dev-1') })
        .expect(HttpStatus.CREATED);

      await signedPost('/api/v1/license/activate', { productCode: 'demo_app', licenseKey: 'DEMO-AAAA-BBBB-CCCC', device: devicePayload('dev-1') })
        .expect(HttpStatus.TOO_MANY_REQUESTS)
        .expect(({ body }) => {
          expect(body).toMatchObject({ code: ErrorCode.RATE_LIMITED, message: 'too many requests', data: null });
        });
    } finally {
      if (previousLimit === undefined) delete process.env.PUBLIC_API_RATE_LIMIT_MAX;
      else process.env.PUBLIC_API_RATE_LIMIT_MAX = previousLimit;
      if (previousWindow === undefined) delete process.env.PUBLIC_API_RATE_LIMIT_WINDOW_MS;
      else process.env.PUBLIC_API_RATE_LIMIT_WINDOW_MS = previousWindow;
    }
  });

  it('returns version policy for a product', async () => {
    await signedGet('/api/v1/version/policy?productCode=demo_app&appVersion=1.0.0')
      .expect(HttpStatus.OK)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          code: ErrorCode.OK,
          data: {
            minSupportedVersion: '1.0.0',
            latestVersion: '1.0.0',
            forceUpgrade: false,
          },
        });
      });
  });

  it('imports an active offline package', async () => {
    await signedPost('/api/v1/offline-packages/import', {
      packageCode: store.offlinePackage.packageCode,
      signature: store.offlinePackage.signature,
      payload: store.offlinePackage.payload,
    })
      .expect(HttpStatus.CREATED)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          code: ErrorCode.OK,
          data: {
            packageCode: store.offlinePackage.packageCode,
            licenseStatus: LicenseStatus.active,
          },
        });
      });
  });

  it('creates a public device unbind request', async () => {
    await activate('dev-1');

    await signedPost('/api/v1/device-unbind-requests', {
      licenseKey: 'DEMO-AAAA-BBBB-CCCC',
      deviceCode: 'dev-1',
      reason: 'change computer',
    })
      .expect(HttpStatus.CREATED)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          code: ErrorCode.OK,
          message: 'created',
          data: {
            licenseId: 1,
            deviceId: 1,
            reason: 'change computer',
            status: 'pending',
          },
        });
      });
  });

  it('approves an admin device unbind request and removes the device', async () => {
    await activate('dev-1');

    const created = await request(app.getHttpServer())
      .post('/admin/device-unbind-requests')
      .send({
        licenseKey: 'DEMO-AAAA-BBBB-CCCC',
        deviceCode: 'dev-1',
        reason: 'change computer',
      })
      .expect(HttpStatus.CREATED);

    await request(app.getHttpServer())
      .put(`/admin/device-unbind-requests/${created.body.data.id}/review`)
      .send({ status: 'approved' })
      .expect(HttpStatus.OK)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          code: ErrorCode.OK,
          data: {
            status: 'approved',
            licenseId: 1,
            deviceId: 1,
          },
        });
      });

    expect(store.devices[0]).toMatchObject({ status: DeviceStatus.removed, unbindCount: 1 });
    expect(store.auditLogs).toEqual(expect.arrayContaining([expect.objectContaining({ targetType: 'device_unbind_request', action: 'review' })]));
  });

  it('revokes an offline package from the admin API', async () => {
    await request(app.getHttpServer())
      .put(`/admin/offline-packages/${store.offlinePackage.id}/status`)
      .send({ status: 'revoked' })
      .expect(HttpStatus.OK)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          code: ErrorCode.OK,
          data: {
            id: store.offlinePackage.id,
            status: 'revoked',
          },
        });
      });

    expect(store.offlinePackage.status).toBe('revoked');
    expect(store.auditLogs).toEqual(expect.arrayContaining([expect.objectContaining({ targetType: 'offline_package', action: 'update_status' })]));
  });

  it('resolves a risk event from the admin API', async () => {
    const created = await request(app.getHttpServer())
      .post('/admin/risk-events')
      .send({
        licenseId: 1,
        deviceId: 1,
        eventType: 'activation_frequency',
        severity: 'high',
        summary: 'too many activations',
        details: { count: 10 },
      })
      .expect(HttpStatus.CREATED);

    await request(app.getHttpServer())
      .put(`/admin/risk-events/${created.body.data.id}/status`)
      .send({ status: 'resolved' })
      .expect(HttpStatus.OK)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          code: ErrorCode.OK,
          data: {
            id: created.body.data.id,
            status: 'resolved',
          },
        });
      });

    await request(app.getHttpServer())
      .get('/admin/risk-summary')
      .expect(HttpStatus.OK)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          code: ErrorCode.OK,
          data: {
            total: 1,
            open: 0,
            high: 1,
            resolved: 1,
          },
        });
      });
  });
});
