import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { DeviceService } from '../device/device.service';
import { LeaseService } from '../lease/lease.service';
import { VersionService } from '../version/version.service';
import { AuditService } from '../audit/audit.service';
import { ActivateDto } from './dto/license.dto';
import { LicenseService } from './license.service';

@Injectable()
export class ActivationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly licenses: LicenseService,
    private readonly devices: DeviceService,
    private readonly leases: LeaseService,
    private readonly versions: VersionService,
    private readonly audit: AuditService,
  ) {}

  async activate(dto: ActivateDto, ip?: string, userAgent?: string) {
    const license = await this.licenses.validateLicense(dto.productCode, dto.licenseKey);
    const device = await this.devices.getOrCreateDevice(license.id, this.licenses.maxDevices(license), dto.device, ip);
    const issued = await this.leases.issue(license.id, device.id, dto.device.appVersion);

    if (!license.activateAt) {
      await this.prisma.license.update({ where: { id: license.id }, data: { activateAt: new Date() } });
    }

    await this.audit.activation({
      licenseId: license.id,
      deviceId: device.id,
      resultCode: 'OK',
      message: 'activated',
      ip,
      userAgent,
      requestPayload: dto,
    });

    return {
      licenseStatus: license.status,
      deviceId: device.id,
      leaseToken: issued.leaseToken,
      leaseExpireAt: issued.leaseExpireAt,
      featureFlags: this.licenses.featureFlags(license),
      versionPolicy: await this.versions.getPolicy(dto.productCode),
    };
  }
}
