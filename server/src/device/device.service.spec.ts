import { DeviceStatus } from '@prisma/client';
import { ErrorCode } from '../common/error-codes';
import { DeviceService } from './device.service';

const dto = {
  deviceCode: 'dev-1',
  fingerprintHash: 'hash',
  deviceName: 'pc',
  osType: 'windows',
  osVersion: '11',
  appVersion: '1.0.0',
  hardwareSummary: {},
};

describe('DeviceService', () => {
  it('creates a device when under limit', async () => {
    const prisma = {
      device: {
        findUnique: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 1, ...dto }),
      },
    } as any;
    const service = new DeviceService(prisma);
    await expect(service.getOrCreateDevice(1, 1, dto)).resolves.toMatchObject({ id: 1 });
  });

  it('rejects when active device limit is reached', async () => {
    const prisma = {
      device: {
        findUnique: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(1),
      },
    } as any;
    const service = new DeviceService(prisma);
    await expect(service.getOrCreateDevice(1, 1, dto)).rejects.toMatchObject({ code: ErrorCode.DEVICE_LIMIT_REACHED });
  });

  it('kicks the oldest active device when configured', async () => {
    const oldest = { id: 7, licenseId: 1, status: DeviceStatus.active, lastSeenAt: new Date('2026-01-01T00:00:00.000Z') };
    const prisma = {
      device: {
        findUnique: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(1),
        findFirst: jest.fn().mockResolvedValue(oldest),
        update: jest.fn().mockResolvedValue({ ...oldest, status: DeviceStatus.removed }),
        create: jest.fn().mockResolvedValue({ id: 8, ...dto }),
      },
      lease: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    } as any;
    const service = new DeviceService(prisma);

    await expect(service.getOrCreateDevice(1, 1, dto, undefined, 'kick_oldest')).resolves.toMatchObject({ id: 8 });
    expect(prisma.device.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { status: DeviceStatus.removed, unbindCount: { increment: 1 } },
    });
    expect(prisma.lease.updateMany).toHaveBeenCalledWith({
      where: { deviceId: 7, status: 'active' },
      data: { status: 'revoked' },
    });
  });

  it('rejects removed devices', async () => {
    const prisma = { device: { findUnique: jest.fn().mockResolvedValue({ status: DeviceStatus.removed }) } } as any;
    const service = new DeviceService(prisma);
    await expect(service.findActiveByCode('dev-1')).rejects.toMatchObject({ code: ErrorCode.DEVICE_REMOVED });
  });
});
