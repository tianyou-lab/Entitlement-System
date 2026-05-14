import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuditService } from '../audit/audit.service';
import { NonceReplayService, RequestSignatureGuard } from '../common/guards/request-signature.guard';
import { AuthController } from './auth/auth.controller';
import { AdminAuthGuard } from './auth/admin-auth.guard';
import { AuthService } from './auth/auth.service';
import { DevicesController } from './devices/devices.controller';
import { LicensesController } from './licenses/licenses.controller';
import { LogsController } from './logs/logs.controller';
import { PlansController } from './plans/plans.controller';
import { P2AdminController, PublicDeviceUnbindController, PublicOfflinePackageController } from './p2/p2.controller';
import { ProductsController } from './products/products.controller';
import { VersionPoliciesController } from './version-policies/version-policies.controller';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-jwt-secret',
      signOptions: { expiresIn: '8h' },
    }),
  ],
  controllers: [AuthController, ProductsController, PlansController, LicensesController, DevicesController, LogsController, VersionPoliciesController, P2AdminController, PublicOfflinePackageController, PublicDeviceUnbindController],
  providers: [AuthService, AdminAuthGuard, AuditService, NonceReplayService, RequestSignatureGuard],
})
export class AdminModule {}
