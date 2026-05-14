import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ErrorCode } from '../../common/error-codes';
import { AppError } from '../../common/errors';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
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
      request.admin = adminToken;
      const admin = await this.prisma.admin.findUnique({ where: { id: adminToken.sub } });
      if (!admin || (!admin.passwordChangedAt && !request.path.endsWith('/admin/auth/change-password'))) {
        throw new AppError(ErrorCode.UNAUTHORIZED, 'password change required', HttpStatus.UNAUTHORIZED);
      }
      return true;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(ErrorCode.UNAUTHORIZED, 'invalid token', HttpStatus.UNAUTHORIZED);
    }
  }
}
