import { Body, Controller, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { ok } from '../common/response';
import { ActivationService } from './activation.service';
import { ActivateDto } from './dto/license.dto';

@Controller('/api/v1/license-ui')
export class LicenseUiController {
  constructor(private readonly activation: ActivationService) {}

  @Post('activate')
  async activate(@Body() dto: ActivateDto, @Req() req: Request) {
    return ok(await this.activation.activate(dto, req.ip, req.get('user-agent')), 'activated');
  }
}
