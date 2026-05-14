import { LeaseStatus } from '@prisma/client';
import { ErrorCode } from '../common/error-codes';
import { LeaseService } from './lease.service';

describe('LeaseService', () => {
  it('issues and validates a lease token', async () => {
    const store: any = {};
    const prisma = {
      lease: {
        create: jest.fn().mockImplementation(({ data }) => {
          store.lease = { id: 1, ...data, device: { deviceCode: 'dev-1' }, license: {} };
          return Promise.resolve(store.lease);
        }),
        findUnique: jest.fn().mockImplementation(() => Promise.resolve(store.lease)),
        update: jest.fn(),
      },
    } as any;
    const service = new LeaseService(prisma);
    const issued = await service.issue(1, 2, '1.0.0');
    await expect(service.validate(issued.leaseToken, 'dev-1')).resolves.toMatchObject({ id: 1 });
  });

  it('rejects expired lease', async () => {
    const store: any = {};
    const prisma = {
      lease: {
        create: jest.fn().mockImplementation(({ data }) => {
          store.lease = { id: 1, ...data, expireAt: new Date(Date.now() - 1), status: LeaseStatus.active, device: { deviceCode: 'dev-1' }, license: {} };
          return Promise.resolve(store.lease);
        }),
        findUnique: jest.fn().mockImplementation(() => Promise.resolve(store.lease)),
        update: jest.fn().mockResolvedValue({}),
      },
    } as any;
    const service = new LeaseService(prisma);
    const issued = await service.issue(1, 2, '1.0.0');
    await expect(service.validate(issued.leaseToken, 'dev-1')).rejects.toMatchObject({ code: ErrorCode.LEASE_EXPIRED });
  });
});
