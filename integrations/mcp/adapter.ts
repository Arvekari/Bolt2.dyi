import { MCPService } from '~/lib/services/mcpService';
import { logAuditEvent } from '~/platform/logging/audit-log';

export async function processMcpMessagesForRequest(input: {
  requestId: string;
  messages: any[];
  dataStream: any;
}) {
  const mcpService = MCPService.getInstance();
  const startedAt = Date.now();

  try {
    const processed = await mcpService.processToolInvocations(input.messages as any, input.dataStream);

    logAuditEvent({
      action: 'mcp.process.messages',
      requestId: input.requestId,
      provider: 'mcp',
      status: 'success',
      metadata: {
        durationMs: Date.now() - startedAt,
      },
    });

    return processed;
  } catch (error) {
    logAuditEvent({
      action: 'mcp.process.messages',
      requestId: input.requestId,
      provider: 'mcp',
      status: 'failed',
      metadata: {
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : 'unknown',
      },
    });

    throw error;
  }
}
