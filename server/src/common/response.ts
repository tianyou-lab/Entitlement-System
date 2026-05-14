import { ErrorCode } from './error-codes';

export interface ApiResponse<T> {
  code: ErrorCode | string;
  message: string;
  data: T | null;
}

export function ok<T>(data: T, message = 'success'): ApiResponse<T> {
  return { code: ErrorCode.OK, message, data };
}
