import { DeviceFingerprint } from './device-fingerprint';

describe('DeviceFingerprint', () => {
  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  it('generates stable values with overrides', () => {
    const device = DeviceFingerprint.collect('1.2.3', { deviceCode: 'dev-fixed', fingerprintHash: 'hash-fixed' });
    expect(device).toMatchObject({ deviceCode: 'dev-fixed', fingerprintHash: 'hash-fixed', appVersion: '1.2.3' });
  });

  it('hashes Windows hardware identifiers before exposing the summary', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('os', () => ({
        arch: () => 'x64',
        hostname: () => 'WIN-HOST',
        networkInterfaces: () => ({
          Ethernet: [
            {
              address: '192.168.1.10',
              netmask: '255.255.255.0',
              family: 'IPv4',
              mac: 'AA:BB:CC:DD:EE:FF',
              internal: false,
              cidr: '192.168.1.10/24',
            },
          ],
        }),
        platform: () => 'win32',
        release: () => '10.0.22631',
        userInfo: () => ({ username: 'alice' }),
      }));
      jest.doMock('child_process', () => ({
        execFileSync: jest.fn((command: string, args: string[]) => {
          if (command === 'reg.exe') {
            return '    MachineGuid    REG_SZ    machine-guid-raw\n';
          }

          const script = args[args.length - 1];
          if (script.includes('Win32_BaseBoard')) {
            return 'baseboard-raw\n';
          }
          if (script.includes('Win32_ComputerSystemProduct')) {
            return 'bios-uuid-raw\n';
          }
          if (script.includes('Win32_Processor')) {
            return 'cpu-id-raw\n';
          }
          if (script.includes('Win32_LogicalDisk')) {
            return 'volume-raw\n';
          }

          return '';
        }),
      }));

      const { DeviceFingerprint: WindowsDeviceFingerprint } = await import('./device-fingerprint');
      const device = WindowsDeviceFingerprint.collect('1.2.3');
      const summary = JSON.stringify(device.hardwareSummary);

      expect(device.hardwareSummary).toMatchObject({
        fingerprintSource: 'windows-hardware-v2',
        hardwareSignals: {
          machineGuid: true,
          baseboardSerial: true,
          biosUuid: true,
          cpuId: true,
          systemVolumeSerial: true,
          macAddresses: 1,
        },
      });
      expect(summary).not.toContain('machine-guid-raw');
      expect(summary).not.toContain('baseboard-raw');
      expect(summary).not.toContain('bios-uuid-raw');
      expect(summary).not.toContain('cpu-id-raw');
      expect(summary).not.toContain('volume-raw');
      expect(summary).not.toContain('AA:BB:CC:DD:EE:FF');
    });
  });
});
