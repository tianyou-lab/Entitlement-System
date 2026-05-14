import { Controller, Get } from '@nestjs/common';
import { ok } from '../common/response';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return ok({
      status: 'ok',
      service: 'entitlement-server',
      timestamp: new Date().toISOString(),
    });
  }
}
