import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { ok } from '../common/response';
import { ActivationService } from './activation.service';
import { DeactivateDto, HeartbeatDto, VerifyDto, ActivateDto } from './dto/license.dto';
import { VerifyHeartbeatService } from './verify-heartbeat.service';

@Controller('/api/v1/license')
export class LicenseController {
  constructor(
    private readonly activation: ActivationService,
    private readonly runtime: VerifyHeartbeatService,
  ) {}

  @Post('activate')
  async activate(@Body() dto: ActivateDto, @Req() req: Request) {
    return ok(await this.activation.activate(dto, req.ip, req.get('user-agent')), 'activated');
  }

  @Post('verify')
  async verify(@Body() dto: VerifyDto, @Req() req: Request) {
    return ok(await this.runtime.verify(dto, req.ip), 'valid');
  }

  @Post('heartbeat')
  async heartbeat(@Body() dto: HeartbeatDto, @Req() req: Request) {
    return ok(await this.runtime.heartbeat(dto, req.ip), 'refreshed');
  }

  @Post('deactivate')
  async deactivate(@Body() dto: DeactivateDto, @Req() req: Request) {
    await this.runtime.deactivate(dto, req.ip);
    return ok(null, 'device removed');
  }

  @Get('info')
  async info(@Query() query: VerifyDto, @Req() req: Request) {
    return ok(await this.runtime.verify(query, req.ip));
  }
}
