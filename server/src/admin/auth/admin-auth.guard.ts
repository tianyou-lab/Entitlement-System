import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ErrorCode } from '../../common/error-codes';
import { AppError } from '../../common/errors';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request & { admin?: unknown }>();
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'missing token', HttpStatus.UNAUTHORIZED);
    }
    try {
      request.admin = await this.jwt.verifyAsync(token);
      return true;
    } catch {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'invalid token', HttpStatus.UNAUTHORIZED);
    }
  }
}
