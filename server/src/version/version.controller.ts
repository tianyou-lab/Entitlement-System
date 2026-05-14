import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RequestSignatureGuard } from '../common/guards/request-signature.guard';
import { ok } from '../common/response';
import { VersionService } from './version.service';

@UseGuards(RequestSignatureGuard)
@Controller('/api/v1/version')
export class VersionController {
  constructor(private readonly versionService: VersionService) {}

  @Get('policy')
  async policy(@Query('productCode') productCode: string) {
    return ok(await this.versionService.getPolicy(productCode));
  }
}
