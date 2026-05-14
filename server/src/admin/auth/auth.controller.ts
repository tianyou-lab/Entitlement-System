import { Body, Controller, Post } from '@nestjs/common';
import { ok } from '../../common/response';
import { LoginDto } from './auth.dto';
import { AuthService } from './auth.service';

@Controller('/admin/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return ok(await this.auth.login(dto));
  }
}
