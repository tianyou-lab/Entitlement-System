import { Controller, Get, UseGuards } from '@nestjs/common';
import { ok } from '../../common/response';
import { PrismaService } from '../../database/prisma.service';
import { MetricsService } from '../../monitoring/metrics.service';
import { AdminAuthGuard } from '../auth/admin-auth.guard';

@UseGuards(AdminAuthGuard)
@Controller('/admin/monitoring')
export class MonitoringController {
  constructor(
    private readonly metrics: MetricsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('metrics')
  async metricsSnapshot() {
    return ok({
      api: this.metrics.snapshot(),
      postgres: await this.postgresSnapshot(),
    });
  }

  private async postgresSnapshot() {
    try {
      const [connections, databaseSize] = await Promise.all([
        this.prisma.$queryRaw<Array<{ count: bigint }>>`select count(*)::bigint as count from pg_stat_activity`,
        this.prisma.$queryRaw<Array<{ size_bytes: bigint }>>`select pg_database_size(current_database())::bigint as size_bytes`,
      ]);
      return {
        connections: Number(connections[0]?.count ?? 0),
        databaseSizeBytes: Number(databaseSize[0]?.size_bytes ?? 0),
      };
    } catch {
      return {
        connections: null,
        databaseSizeBytes: null,
      };
    }
  }
}
