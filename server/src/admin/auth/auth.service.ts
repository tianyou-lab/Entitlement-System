import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AdminStatus } from '@prisma/client';
import { ErrorCode } from '../../common/error-codes';
import { AppError } from '../../common/errors';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto } from './auth.dto';

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
      admin: { id: admin.id, username: admin.username, roleCode: admin.roleCode },
    };
  }
}
