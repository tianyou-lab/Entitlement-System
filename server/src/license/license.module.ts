import { Module } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { DeviceService } from '../device/device.service';
import { LeaseService } from '../lease/lease.service';
import { PlanService } from '../plan/plan.service';
import { ProductService } from '../product/product.service';
import { VersionController } from '../version/version.controller';
import { VersionService } from '../version/version.service';
import { ActivationService } from './activation.service';
import { LicenseController } from './license.controller';
import { LicenseService } from './license.service';
import { VerifyHeartbeatService } from './verify-heartbeat.service';

@Module({
  controllers: [LicenseController, VersionController],
  providers: [
    ProductService,
    PlanService,
    LicenseService,
    DeviceService,
    LeaseService,
    VersionService,
    AuditService,
    ActivationService,
    VerifyHeartbeatService,
  ],
  exports: [ProductService, PlanService, LicenseService, DeviceService, LeaseService, VersionService, AuditService],
})
export class LicenseModule {}
