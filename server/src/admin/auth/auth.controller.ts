import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ok } from '../../common/response';
import { AdminAuthGuard } from './admin-auth.guard';
import { ChangePasswordDto, LoginDto } from './auth.dto';
import { AuthService } from './auth.service';

@Controller('/admin/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return ok(await this.auth.login(dto));
  }

  @UseGuards(AdminAuthGuard)
  @Post('change-password')
  async changePassword(@Body() dto: ChangePasswordDto, @Req() req: Request & { admin?: { sub?: number } }) {
    return ok(await this.auth.changePassword(Number(req.admin?.sub), dto));
  }
}
