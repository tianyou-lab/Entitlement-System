import { createHash } from 'crypto';
import { execFileSync } from 'child_process';
import { arch, hostname, networkInterfaces, platform, release, userInfo } from 'os';
import type { NetworkInterfaceInfo } from 'os';
import { DeviceInfo } from './types';

export class DeviceFingerprint {
  static collect(appVersion: string, overrides: Partial<DeviceInfo> = {}): DeviceInfo {
    const summary = {
      ...collectFingerprintSummary(),
      ...overrides.hardwareSummary,
    };
    const fingerprintHash = overrides.fingerprintHash ?? hash(JSON.stringify(summary));
    const deviceCode = overrides.deviceCode ?? `dev_${fingerprintHash.slice(0, 24)}`;

    return {
      deviceCode,
      fingerprintHash,
      deviceName: overrides.deviceName ?? hostname(),
      osType: overrides.osType ?? platform(),
      osVersion: overrides.osVersion ?? release(),
      appVersion: overrides.appVersion ?? appVersion,
      hardwareSummary: summary,
    };
  }
}

function collectFingerprintSummary(): Record<string, unknown> {
  if (platform() !== 'win32') {
    return collectLegacyFingerprintSummary();
  }

  const windowsSummary = collectWindowsHardwareSummary();
  return hasWindowsHardwareSignal(windowsSummary) ? windowsSummary : collectLegacyFingerprintSummary();
}

function collectLegacyFingerprintSummary(): Record<string, unknown> {
  return {
    hostname: hostname(),
    platform: platform(),
    arch: arch(),
    release: release(),
    user: hash(userInfo().username),
  };
}

function collectWindowsHardwareSummary(): Record<string, unknown> {
  const identifiers = {
    machineGuid: readWindowsMachineGuid(),
    baseboardSerial: readWindowsCimValue('Win32_BaseBoard', 'SerialNumber'),
    biosUuid: readWindowsCimValue('Win32_ComputerSystemProduct', 'UUID'),
    cpuId: readWindowsCimValue('Win32_Processor', 'ProcessorId'),
    systemVolumeSerial: readWindowsSystemVolumeSerial(),
    macAddresses: readMacAddresses(),
  };

  return {
    fingerprintSource: 'windows-hardware-v2',
    machineGuidHash: hashNullable(identifiers.machineGuid),
    baseboardSerialHash: hashNullable(identifiers.baseboardSerial),
    biosUuidHash: hashNullable(identifiers.biosUuid),
    cpuIdHash: hashNullable(identifiers.cpuId),
    systemVolumeSerialHash: hashNullable(identifiers.systemVolumeSerial),
    macAddressesHash: hashNullable(identifiers.macAddresses.join('|')),
    hardwareSignals: {
      machineGuid: Boolean(identifiers.machineGuid),
      baseboardSerial: Boolean(identifiers.baseboardSerial),
      biosUuid: Boolean(identifiers.biosUuid),
      cpuId: Boolean(identifiers.cpuId),
      systemVolumeSerial: Boolean(identifiers.systemVolumeSerial),
      macAddresses: identifiers.macAddresses.length,
    },
  };
}

function hasWindowsHardwareSignal(summary: Record<string, unknown>): boolean {
  const signals = summary.hardwareSignals;
  if (!signals || typeof signals !== 'object') {
    return false;
  }

  return Object.values(signals).some((value) => Boolean(value));
}

function readWindowsMachineGuid(): string | null {
  const output = runCommand('reg.exe', ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid']);
  const match = output?.match(/MachineGuid\s+REG_\w+\s+([^\r\n]+)/i);
  return normalizeIdentifier(match?.[1]);
}

function readWindowsCimValue(className: string, propertyName: string): string | null {
  return normalizeIdentifier(
    runPowerShell(
      [
        `$value = Get-CimInstance -ClassName ${className}`,
        '|',
        `Select-Object -First 1 -ExpandProperty ${propertyName}`,
        ';',
        'if ($null -ne $value) { $value.ToString().Trim() }',
      ].join(' '),
    ),
  );
}

function readWindowsSystemVolumeSerial(): string | null {
  const systemDrive = normalizeSystemDrive(process.env.SystemDrive);
  return normalizeIdentifier(
    runPowerShell(
      [
        `$value = Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DeviceID='${systemDrive}'"`,
        '|',
        'Select-Object -First 1 -ExpandProperty VolumeSerialNumber',
        ';',
        'if ($null -ne $value) { $value.ToString().Trim() }',
      ].join(' '),
    ),
  );
}

function readMacAddresses(): string[] {
  const macAddresses = Object.values(networkInterfaces())
    .flat()
    .filter((networkInterface): networkInterface is NetworkInterfaceInfo =>
      Boolean(networkInterface && !networkInterface.internal && isValidMacAddress(networkInterface.mac)),
    )
    .map((networkInterface) => networkInterface.mac.toLowerCase());

  return Array.from(new Set(macAddresses)).sort();
}

function runPowerShell(command: string): string | null {
  return runCommand('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command]);
}

function runCommand(command: string, args: string[]): string | null {
  try {
    return execFileSync(command, args, { encoding: 'utf8', windowsHide: true, timeout: 3000 });
  } catch {
    return null;
  }
}

function normalizeIdentifier(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  if (!normalized || /^(none|null|unknown|to be filled by o\.e\.m\.|default string)$/i.test(normalized)) {
    return null;
  }

  return normalized;
}

function normalizeSystemDrive(value: string | undefined): string {
  const normalized = value?.trim().toUpperCase();
  return normalized && /^[A-Z]:$/.test(normalized) ? normalized : 'C:';
}

function isValidMacAddress(value: string): boolean {
  return Boolean(value && value !== '00:00:00:00:00:00');
}

function hashNullable(value: string | null): string | null {
  return value ? hash(value) : null;
}

function hash(value: string) {
  return createHash('sha256').update(value).digest('hex');
}
