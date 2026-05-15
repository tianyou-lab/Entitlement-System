import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  it('records request totals, route metrics, and error code counts', () => {
    const metrics = new MetricsService();

    metrics.record({ method: 'GET', path: '/health', statusCode: 200, durationMs: 10, code: 'OK' });
    metrics.record({ method: 'POST', path: '/api/v1/license/activate', statusCode: 400, durationMs: 30, code: 'DEVICE_LIMIT_REACHED' });
    metrics.record({ method: 'POST', path: '/api/v1/license/activate', statusCode: 403, durationMs: 20, code: 'LICENSE_BANNED' });

    const snapshot = metrics.snapshot();
    expect(snapshot.requests).toMatchObject({
      total: 3,
      failures: 2,
      failureRate: 0.6667,
      averageLatencyMs: 20,
      maxLatencyMs: 30,
    });
    expect(snapshot.errorCodes).toEqual({
      DEVICE_LIMIT_REACHED: 1,
      LICENSE_BANNED: 1,
    });
    expect(snapshot.routes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        route: 'POST /api/v1/license/activate',
        count: 2,
        failures: 2,
        failureRate: 1,
        averageLatencyMs: 25,
        maxLatencyMs: 30,
      }),
    ]));
  });
});
