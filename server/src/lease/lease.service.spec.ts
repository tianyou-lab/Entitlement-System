import { DeviceStatus, LeaseStatus } from '@prisma/client';
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
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
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
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    } as any;
    const service = new LeaseService(prisma);
    const issued = await service.issue(1, 2, '1.0.0');
    await expect(service.validate(issued.leaseToken, 'dev-1')).rejects.toMatchObject({ code: ErrorCode.LEASE_EXPIRED });
  });

  it('rejects new lease when concurrency limit is reached', async () => {
    const prisma = {
      lease: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 9,
            licenseId: 1,
            deviceId: 7,
            status: LeaseStatus.active,
            expireAt: new Date(Date.now() + 60_000),
            device: { id: 7, status: DeviceStatus.active, lastSeenAt: new Date('2026-01-01T00:00:00.000Z') },
          },
        ]),
        create: jest.fn(),
      },
    } as any;
    const service = new LeaseService(prisma);

    await expect(service.issue(1, 8, '1.0.0', 1, 'deny_new')).rejects.toMatchObject({ code: ErrorCode.DEVICE_LIMIT_REACHED });
    expect(prisma.lease.create).not.toHaveBeenCalled();
  });

  it('revokes oldest online device when concurrency limit is reached and kick policy is configured', async () => {
    const prisma = {
      lease: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 9,
            licenseId: 1,
            deviceId: 7,
            status: LeaseStatus.active,
            expireAt: new Date(Date.now() + 60_000),
            device: { id: 7, status: DeviceStatus.active, lastSeenAt: new Date('2026-01-01T00:00:00.000Z') },
          },
        ]),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 10, ...data })),
      },
    } as any;
    const service = new LeaseService(prisma);

    await expect(service.issue(1, 8, '1.0.0', 1, 'kick_oldest')).resolves.toMatchObject({ lease: { id: 10 } });
    expect(prisma.lease.updateMany).toHaveBeenCalledWith({
      where: { deviceId: 7, status: LeaseStatus.active },
      data: { status: LeaseStatus.revoked },
    });
  });
});
