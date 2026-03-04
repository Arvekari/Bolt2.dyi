import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('audit-log');

export function logAuditEvent(event: {
  action: string;
  requestId?: string;
  provider?: string;
  status: 'success' | 'failed' | 'blocked';
  metadata?: Record<string, unknown>;
}) {
  logger.info('audit event', {
    action: event.action,
    requestId: event.requestId,
    provider: event.provider,
    status: event.status,
    metadata: event.metadata,
  });
}
