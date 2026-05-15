import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startedAt = Date.now();
    const method = request.method;
    const path = request.route?.path ?? request.path;

    return next.handle().pipe(
      tap((body) => {
        this.metrics.record({
          method,
          path,
          statusCode: response.statusCode,
          durationMs: Date.now() - startedAt,
          code: readCode(body),
        });
      }),
      catchError((error) => {
        this.metrics.record({
          method,
          path,
          statusCode: typeof error?.getStatus === 'function' ? error.getStatus() : 500,
          durationMs: Date.now() - startedAt,
          code: readExceptionCode(error),
        });
        return throwError(() => error);
      }),
    );
  }
}

function readCode(body: unknown) {
  if (!body || typeof body !== 'object') return undefined;
  const code = (body as Record<string, unknown>).code;
  return typeof code === 'string' ? code : undefined;
}

function readExceptionCode(error: unknown) {
  if (!error || typeof error !== 'object' || typeof (error as { getResponse?: unknown }).getResponse !== 'function') return undefined;
  const response = (error as { getResponse: () => unknown }).getResponse();
  if (!response || typeof response !== 'object') return undefined;
  const code = (response as Record<string, unknown>).code;
  return typeof code === 'string' ? code : undefined;
}
