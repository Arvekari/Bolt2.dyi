import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('request-context');

export function getRequestId(request: Request): string {
  return (
    request.headers.get('x-request-id') ||
    request.headers.get('cf-ray') ||
    request.headers.get('x-correlation-id') ||
    `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  );
}

export function getClientIp(request: Request): string {
  return request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
}

export function logApiRequest(requestId: string, request: Request, extras?: Record<string, unknown>) {
  logger.info('api request', {
    requestId,
    method: request.method,
    path: new URL(request.url).pathname,
    ...extras,
  });
}
