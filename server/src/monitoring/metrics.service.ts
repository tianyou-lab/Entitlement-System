import { Injectable } from '@nestjs/common';

interface RouteMetric {
  count: number;
  failures: number;
  totalLatencyMs: number;
  maxLatencyMs: number;
}

@Injectable()
export class MetricsService {
  private startedAt = new Date();
  private totalRequests = 0;
  private failedRequests = 0;
  private totalLatencyMs = 0;
  private maxLatencyMs = 0;
  private readonly routes = new Map<string, RouteMetric>();
  private readonly errorCodes = new Map<string, number>();

  record(input: { method: string; path: string; statusCode: number; durationMs: number; code?: string }) {
    this.totalRequests += 1;
    this.totalLatencyMs += input.durationMs;
    this.maxLatencyMs = Math.max(this.maxLatencyMs, input.durationMs);

    const failed = input.statusCode >= 400 || (input.code !== undefined && input.code !== 'OK');
    if (failed) {
      this.failedRequests += 1;
      if (input.code) this.errorCodes.set(input.code, (this.errorCodes.get(input.code) ?? 0) + 1);
    }

    const key = `${input.method.toUpperCase()} ${input.path}`;
    const route = this.routes.get(key) ?? { count: 0, failures: 0, totalLatencyMs: 0, maxLatencyMs: 0 };
    route.count += 1;
    route.failures += failed ? 1 : 0;
    route.totalLatencyMs += input.durationMs;
    route.maxLatencyMs = Math.max(route.maxLatencyMs, input.durationMs);
    this.routes.set(key, route);
  }

  snapshot() {
    return {
      startedAt: this.startedAt.toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startedAt.getTime()) / 1000),
      requests: {
        total: this.totalRequests,
        failures: this.failedRequests,
        failureRate: ratio(this.failedRequests, this.totalRequests),
        averageLatencyMs: average(this.totalLatencyMs, this.totalRequests),
        maxLatencyMs: this.maxLatencyMs,
      },
      errorCodes: Object.fromEntries([...this.errorCodes.entries()].sort(([left], [right]) => left.localeCompare(right))),
      routes: [...this.routes.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([route, metric]) => ({
          route,
          count: metric.count,
          failures: metric.failures,
          failureRate: ratio(metric.failures, metric.count),
          averageLatencyMs: average(metric.totalLatencyMs, metric.count),
          maxLatencyMs: metric.maxLatencyMs,
        })),
    };
  }

  reset() {
    this.startedAt = new Date();
    this.totalRequests = 0;
    this.failedRequests = 0;
    this.totalLatencyMs = 0;
    this.maxLatencyMs = 0;
    this.routes.clear();
    this.errorCodes.clear();
  }
}

function average(total: number, count: number) {
  return count > 0 ? Math.round((total / count) * 100) / 100 : 0;
}

function ratio(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 10000) / 10000 : 0;
}
