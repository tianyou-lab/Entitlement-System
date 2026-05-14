import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AdminStatus } from '@prisma/client';
import { ErrorCode } from '../../common/error-codes';
import { AppError } from '../../common/errors';
import { PrismaService } from '../../database/prisma.service';
import { ChangePasswordDto, LoginDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const admin = await this.prisma.admin.findUnique({ where: { username: dto.username } });
    if (!admin || admin.status !== AdminStatus.active) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'invalid credentials', HttpStatus.UNAUTHORIZED);
    }
    const matched = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!matched) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'invalid credentials', HttpStatus.UNAUTHORIZED);
    }
    return {
      accessToken: await this.jwt.signAsync({ sub: admin.id, username: admin.username, roleCode: admin.roleCode }),
      passwordChangeRequired: !admin.passwordChangedAt,
      admin: { id: admin.id, username: admin.username, roleCode: admin.roleCode },
    };
  }

  async changePassword(adminId: number, dto: ChangePasswordDto) {
    if (dto.newPassword.length < 12) {
      throw new AppError(ErrorCode.BAD_REQUEST, 'new password must be at least 12 characters');
    }
    const admin = await this.prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin || admin.status !== AdminStatus.active) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'invalid credentials', HttpStatus.UNAUTHORIZED);
    }
    const matched = await bcrypt.compare(dto.oldPassword, admin.passwordHash);
    if (!matched) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'invalid credentials', HttpStatus.UNAUTHORIZED);
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.admin.update({ where: { id: admin.id }, data: { passwordHash, passwordChangedAt: new Date() } });
    return { changed: true };
  }
}
