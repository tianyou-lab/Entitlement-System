import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuditService } from '../audit/audit.service';
import { AuthController } from './auth/auth.controller';
import { AdminAuthGuard } from './auth/admin-auth.guard';
import { AuthService } from './auth/auth.service';
import { LicensesController } from './licenses/licenses.controller';
import { PlansController } from './plans/plans.controller';
import { ProductsController } from './products/products.controller';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-jwt-secret',
      signOptions: { expiresIn: '8h' },
    }),
  ],
  controllers: [AuthController, ProductsController, PlansController, LicensesController],
  providers: [AuthService, AdminAuthGuard, AuditService],
})
export class AdminModule {}
