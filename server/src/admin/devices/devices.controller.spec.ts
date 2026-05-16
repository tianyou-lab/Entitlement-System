import { DeviceStatus } from '@prisma/client';
import { isDeviceOnline, readDeviceOnlineWindowMs } from './devices.controller';

describe('DevicesController online status', () => {
  const now = new Date('2026-05-16T12:00:00.000Z');

  afterEach(() => {
    delete process.env.DEVICE_ONLINE_WINDOW_SECONDS;
  });

  it('uses recent heartbeat activity to mark active devices online', () => {
    expect(isDeviceOnline({
      status: DeviceStatus.active,
      lastSeenAt: new Date('2026-05-16T10:00:00.000Z'),
      heartbeatLogs: [{ createdAt: new Date('2026-05-16T11:50:00.000Z') }],
    }, now)).toBe(true);
  });

  it('marks active devices offline after the heartbeat window expires', () => {
    expect(isDeviceOnline({
      status: DeviceStatus.active,
      lastSeenAt: new Date('2026-05-16T11:59:00.000Z'),
      heartbeatLogs: [{ createdAt: new Date('2026-05-16T11:30:00.000Z') }],
    }, now)).toBe(false);
  });

  it('falls back to lastSeenAt when no heartbeat exists yet', () => {
    expect(isDeviceOnline({
      status: DeviceStatus.active,
      lastSeenAt: new Date('2026-05-16T11:55:00.000Z'),
      heartbeatLogs: [],
    }, now)).toBe(true);
  });

  it('supports overriding the online window through env seconds', () => {
    process.env.DEVICE_ONLINE_WINDOW_SECONDS = '30';
    expect(readDeviceOnlineWindowMs()).toBe(30_000);
  });
});
