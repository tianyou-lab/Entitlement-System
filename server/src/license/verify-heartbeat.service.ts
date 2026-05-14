import { Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { DeviceService } from '../device/device.service';
import { LeaseService } from '../lease/lease.service';
import { VersionService } from '../version/version.service';
import { DeactivateDto, HeartbeatDto, VerifyDto } from './dto/license.dto';
import { LicenseService } from './license.service';

@Injectable()
export class VerifyHeartbeatService {
  constructor(
    private readonly licenses: LicenseService,
    private readonly devices: DeviceService,
    private readonly leases: LeaseService,
    private readonly versions: VersionService,
    private readonly audit: AuditService,
  ) {}

  async verify(dto: VerifyDto, ip?: string) {
    const lease = await this.leases.validate(dto.leaseToken, dto.deviceCode);
    const license = await this.licenses.ensureRuntimeValid(lease.licenseId, dto.productCode);
    await this.devices.findActiveByCode(dto.deviceCode);
    await this.audit.heartbeat({
      licenseId: lease.licenseId,
      deviceId: lease.deviceId,
      leaseId: lease.id,
      actionType: 'verify',
      resultCode: 'OK',
      ip,
      payload: dto,
    });

    return {
      licenseStatus: license.status,
      needRefresh: lease.expireAt.getTime() - Date.now() < 30 * 60 * 1000,
      featureFlags: this.licenses.featureFlags(license),
      versionPolicy: await this.versions.getPolicy(dto.productCode),
    };
  }

  async heartbeat(dto: HeartbeatDto, ip?: string) {
    const lease = await this.leases.validate(dto.leaseToken, dto.deviceCode);
    const license = await this.licenses.ensureRuntimeValid(lease.licenseId, dto.productCode);
    await this.devices.touch(lease.deviceId, dto.appVersion, ip);
    await this.leases.revoke(lease.id);
    const issued = await this.leases.issue(lease.licenseId, lease.deviceId, dto.appVersion);
    await this.audit.heartbeat({
      licenseId: lease.licenseId,
      deviceId: lease.deviceId,
      leaseId: issued.lease.id,
      actionType: 'heartbeat',
      resultCode: 'OK',
      ip,
      payload: dto,
    });

    return {
      leaseToken: issued.leaseToken,
      leaseExpireAt: issued.leaseExpireAt,
      featureFlags: this.licenses.featureFlags(license),
      versionPolicy: await this.versions.getPolicy(dto.productCode),
    };
  }

  async deactivate(dto: DeactivateDto, ip?: string) {
    const license = await this.licenses.validateLicense(dto.productCode, dto.licenseKey);
    const device = await this.devices.findActiveByCode(dto.deviceCode);
    if (device.licenseId !== license.id) {
      await this.audit.heartbeat({ licenseId: license.id, deviceId: device.id, actionType: 'deactivate', resultCode: 'DEVICE_REMOVED', ip, payload: dto });
      return null;
    }
    await this.devices.remove(dto.deviceCode);
    await this.leases.revokeActiveByDevice(device.id);
    await this.audit.heartbeat({ licenseId: license.id, deviceId: device.id, actionType: 'deactivate', resultCode: 'OK', ip, payload: dto });
    return null;
  }
}
