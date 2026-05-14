import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { DatabaseModule } from './database/database.module';
import { LicenseModule } from './license/license.module';

@Module({
  imports: [DatabaseModule, LicenseModule, AdminModule],
})
export class AppModule {}
