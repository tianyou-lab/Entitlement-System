import { INestApplication, HttpStatus, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DeviceStatus, LeaseStatus, LicenseStatus, PlanStatus, ProductStatus } from '@prisma/client';
import * as request from 'supertest';
import { AuditService } from '../src/audit/audit.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ErrorCode } from '../src/common/error-codes';
import { PrismaService } from '../src/database/prisma.service';
import { DeviceService } from '../src/device/device.service';
import { LeaseService } from '../src/lease/lease.service';
import { ActivationService } from '../src/license/activation.service';
import { LicenseController } from '../src/license/license.controller';
import { LicenseService } from '../src/license/license.service';
import { VerifyHeartbeatService } from '../src/license/verify-heartbeat.service';
import { PlanService } from '../src/plan/plan.service';
import { ProductService } from '../src/product/product.service';
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
    licenseKey: 'DEMO-AAAA-BBBB-CCCC',
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

  const prisma = {
    product: {
      findUnique: jest.fn(({ where }) => (where.productCode === product.productCode ? Promise.resolve(product) : Promise.resolve(null))),
    },
    license: {
      findUnique: jest.fn(({ where, include }) => {
        const found = where.licenseKey === license.licenseKey || where.id === license.id ? license : null;
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
      findUnique: jest.fn(({ where }) => Promise.resolve(devices.find((device) => device.deviceCode === where.deviceCode) ?? null)),
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
      create: jest.fn(({ data }) => {
        activationLogs.push(data);
        return Promise.resolve(data);
      }),
    },
    heartbeatLog: {
      create: jest.fn(({ data }) => {
        heartbeatLogs.push(data);
        return Promise.resolve(data);
      }),
    },
  };

  return { prisma, license, devices, leases };
}

describe('License API (e2e)', () => {
  let app: INestApplication;
  let store: ReturnType<typeof createPrismaStub>;

  beforeEach(async () => {
    store = createPrismaStub();
    const moduleRef = await Test.createTestingModule({
      controllers: [LicenseController],
      providers: [
        ProductService,
        PlanService,
        LicenseService,
        DeviceService,
        LeaseService,
        VersionService,
        AuditService,
        ActivationService,
        VerifyHeartbeatService,
        { provide: PrismaService, useValue: store.prisma },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  async function activate(deviceCode = 'dev-1') {
    const res = await request(app.getHttpServer())
      .post('/api/v1/license/activate')
      .send({ productCode: 'demo_app', licenseKey: 'DEMO-AAAA-BBBB-CCCC', device: devicePayload(deviceCode) })
      .expect(HttpStatus.CREATED);
    return res.body.data.leaseToken as string;
  }

  it('activates, verifies, heartbeats, and deactivates a device', async () => {
    const leaseToken = await activate();

    await request(app.getHttpServer())
      .post('/api/v1/license/verify')
      .send({ productCode: 'demo_app', leaseToken, deviceCode: 'dev-1', appVersion: '1.0.0' })
      .expect(HttpStatus.CREATED)
      .expect(({ body }) => {
        expect(body).toMatchObject({ code: ErrorCode.OK, message: 'valid', data: { licenseStatus: LicenseStatus.active } });
      });

    const heartbeat = await request(app.getHttpServer())
      .post('/api/v1/license/heartbeat')
      .send({ productCode: 'demo_app', leaseToken, deviceCode: 'dev-1', appVersion: '1.0.1' })
      .expect(HttpStatus.CREATED);
    expect(heartbeat.body).toMatchObject({ code: ErrorCode.OK, message: 'refreshed' });
    expect(heartbeat.body.data.leaseToken).not.toEqual(leaseToken);

    await request(app.getHttpServer())
      .post('/api/v1/license/deactivate')
      .send({ productCode: 'demo_app', licenseKey: 'DEMO-AAAA-BBBB-CCCC', deviceCode: 'dev-1' })
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

    await request(app.getHttpServer())
      .post('/api/v1/license/verify')
      .send({ productCode: 'demo_app', leaseToken, deviceCode: 'dev-1', appVersion: '1.0.0' })
      .expect(HttpStatus.FORBIDDEN)
      .expect(({ body }) => {
        expect(body).toMatchObject({ code: ErrorCode.LICENSE_BANNED, message: 'license banned', data: null });
      });
  });

  it('rejects activation when the active device limit is reached', async () => {
    await activate('dev-1');

    await request(app.getHttpServer())
      .post('/api/v1/license/activate')
      .send({ productCode: 'demo_app', licenseKey: 'DEMO-AAAA-BBBB-CCCC', device: devicePayload('dev-2') })
      .expect(HttpStatus.BAD_REQUEST)
      .expect(({ body }) => {
        expect(body).toMatchObject({ code: ErrorCode.DEVICE_LIMIT_REACHED, message: 'device limit reached', data: null });
      });
  });
});
