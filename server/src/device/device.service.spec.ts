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

  it('rejects removed devices', async () => {
    const prisma = { device: { findUnique: jest.fn().mockResolvedValue({ status: DeviceStatus.removed }) } } as any;
    const service = new DeviceService(prisma);
    await expect(service.findActiveByCode('dev-1')).rejects.toMatchObject({ code: ErrorCode.DEVICE_REMOVED });
  });
});
