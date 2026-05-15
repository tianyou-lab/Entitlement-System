import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { LicenseModule } from './license/license.module';
import { MonitoringModule } from './monitoring/monitoring.module';

@Module({
  imports: [DatabaseModule, MonitoringModule, HealthModule, LicenseModule, AdminModule],
})
export class AppModule {}
