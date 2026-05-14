import { Controller, Get, Query } from '@nestjs/common';
import { ok } from '../common/response';
import { VersionService } from './version.service';

@Controller('/api/v1/version')
export class VersionController {
  constructor(private readonly versionService: VersionService) {}

  @Get('policy')
  async policy(@Query('productCode') productCode: string) {
    return ok(await this.versionService.getPolicy(productCode));
  }
}
