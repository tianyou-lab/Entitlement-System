import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { LicenseController } from '../src/license/license.controller';
import { ActivationService } from '../src/license/activation.service';
import { VerifyHeartbeatService } from '../src/license/verify-heartbeat.service';

describe('License API (e2e contract)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [LicenseController],
      providers: [
        { provide: ActivationService, useValue: { activate: jest.fn().mockResolvedValue({ leaseToken: 'token', featureFlags: { publish: true } }) } },
        {
          provide: VerifyHeartbeatService,
          useValue: {
            verify: jest.fn().mockResolvedValue({ licenseStatus: 'active', needRefresh: false }),
            heartbeat: jest.fn().mockResolvedValue({ leaseToken: 'new-token' }),
            deactivate: jest.fn().mockResolvedValue(null),
          },
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/license/activate returns unified response', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/license/activate').send({ productCode: 'demo', licenseKey: 'LIC', device: {} }).expect(201);
    expect(res.body).toMatchObject({ code: 'OK', message: 'activated', data: { leaseToken: 'token' } });
  });

  it('POST /api/v1/license/verify returns unified response', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/license/verify').send({ productCode: 'demo', leaseToken: 'token', deviceCode: 'dev', appVersion: '1.0.0' }).expect(201);
    expect(res.body).toMatchObject({ code: 'OK', message: 'valid' });
  });

  it('POST /api/v1/license/heartbeat returns refreshed response', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/license/heartbeat').send({ productCode: 'demo', leaseToken: 'token', deviceCode: 'dev', appVersion: '1.0.0' }).expect(201);
    expect(res.body).toMatchObject({ code: 'OK', message: 'refreshed', data: { leaseToken: 'new-token' } });
  });

  it('POST /api/v1/license/deactivate returns removed response', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/license/deactivate').send({ productCode: 'demo', licenseKey: 'LIC', deviceCode: 'dev' }).expect(201);
    expect(res.body).toMatchObject({ code: 'OK', message: 'device removed', data: null });
  });
});
