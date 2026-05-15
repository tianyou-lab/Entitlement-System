import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { AdminStatus } from '@prisma/client';
import { Request } from 'express';
import { ErrorCode } from '../../common/error-codes';
import { AppError } from '../../common/errors';
import { PrismaService } from '../../database/prisma.service';
import { ADMIN_ROLES_KEY, AdminRole } from './admin-roles.decorator';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request & { admin?: unknown }>();
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'missing token', HttpStatus.UNAUTHORIZED);
    }
    try {
      const adminToken = await this.jwt.verifyAsync<{ sub: number; username: string; roleCode: string }>(token);
      const admin = await this.prisma.admin.findUnique({ where: { id: adminToken.sub } });
      if (!admin || admin.status !== AdminStatus.active) {
        throw new AppError(ErrorCode.UNAUTHORIZED, 'invalid token', HttpStatus.UNAUTHORIZED);
      }
      if (!admin.passwordChangedAt && !request.path.endsWith('/admin/auth/change-password')) {
        throw new AppError(ErrorCode.UNAUTHORIZED, 'password change required', HttpStatus.UNAUTHORIZED);
      }
      request.admin = {
        sub: admin.id,
        username: admin.username,
        roleCode: admin.roleCode,
        tenantId: admin.tenantId,
      };
      this.ensureRoleAllowed(admin.roleCode, request.method, context);
      return true;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(ErrorCode.UNAUTHORIZED, 'invalid token', HttpStatus.UNAUTHORIZED);
    }
  }

  private ensureRoleAllowed(roleCode: string, method: string, context: ExecutionContext) {
    const role = normalizeRole(roleCode);
    const allowedRoles =
      this.reflector.getAllAndOverride<AdminRole[]>(ADMIN_ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? defaultAllowedRoles(method);

    if (!allowedRoles.includes(role)) {
      throw new AppError(ErrorCode.FORBIDDEN, 'permission denied', HttpStatus.FORBIDDEN);
    }
  }
}

function defaultAllowedRoles(method: string): AdminRole[] {
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return ['super_admin', 'operator', 'viewer'];
  return ['super_admin', 'operator'];
}

function normalizeRole(roleCode: string): AdminRole {
  if (roleCode === 'super_admin' || roleCode === 'operator' || roleCode === 'viewer') return roleCode;
  return 'viewer';
}
