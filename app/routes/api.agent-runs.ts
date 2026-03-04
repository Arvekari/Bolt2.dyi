import { type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { executeCoreChatStream } from '~/core/chat-engine';
import { resolveExecutionEngine } from '~/core/model-router';
import { AgentRunService } from '~/lib/.server/agents/agentRunService';
import {
  cancelOpenClawRun,
  executeOpenClawAgent,
  getOpenClawRunStatus,
  isOpenClawConfigured,
} from '~/lib/.server/extensions/openclaw/openclaw-client';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('api.agent-runs');

async function readTextStream(stream: any) {
  let output = '';

  for await (const chunk of stream) {
    output += String(chunk);

    if (output.length > 8000) {
      break;
    }
  }

  return output;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const service = AgentRunService.getInstance();
  const url = new URL(request.url);
  const runId = url.searchParams.get('runId');

  if (!runId) {
    return Response.json({ runs: await service.listRunsPersisted() });
  }

  const run = await service.getRunPersisted(runId);

  if (!run) {
    return Response.json({ error: 'Run not found' }, { status: 404 });
  }

  const remoteRunId =
    run.engine === 'openclaw' && typeof run.metadata?.remoteRunId === 'string'
      ? run.metadata.remoteRunId
      : undefined;

  if (!remoteRunId) {
    return Response.json(run);
  }

  try {
    const remoteStatus = await getOpenClawRunStatus({
      remoteRunId,
    });

    return Response.json({
      ...run,
      remoteStatus,
    });
  } catch (error) {
    logger.warn('openclaw remote status failed', error);
    return Response.json(run);
  }
}

export async function action({ request, context }: ActionFunctionArgs) {
  const service = AgentRunService.getInstance();
  const env = context.cloudflare?.env as any;
  service.setEnvironment(env);

  try {
    const body = await request.json<{
      intent: 'start' | 'cancel';
      runId?: string;
      system?: string;
      message?: string;
      model?: string;
      provider?: string;
      timeoutMs?: number;
      engine?: 'llm' | 'openclaw' | 'workflow';
    }>();

    if (body.intent === 'cancel') {
      if (!body.runId) {
        return Response.json({ error: 'runId is required for cancel' }, { status: 400 });
      }

      const cancelled = service.cancelRun(body.runId);

      try {
        const run = await service.getRunPersisted(body.runId);

        if (run?.engine === 'openclaw') {
          const remoteRunId =
            (typeof run.metadata?.remoteRunId === 'string' && run.metadata.remoteRunId) || undefined;

          if (remoteRunId) {
            await cancelOpenClawRun({
              remoteRunId,
              env,
            });
          }
        }
      } catch (error) {
        logger.warn('openclaw remote cancel failed', error);
      }

      return Response.json({ cancelled });
    }

    if (!body.system || !body.message || !body.model || !body.provider) {
      return Response.json({ error: 'Missing required fields for start' }, { status: 400 });
    }

    const run = service.createRun({
      request: {
        system: body.system,
        message: body.message,
        model: body.model,
        provider: body.provider,
      },
      timeoutMs: body.timeoutMs ?? 120000,
      engine: body.engine ?? resolveExecutionEngine({ provider: body.provider, model: body.model }),
      metadata: {
        openClawConfigured: isOpenClawConfigured(env),
      },
    });

    void service.executeRun(run.runId, {
      timeoutMs: body.timeoutMs ?? 120000,
      plan: async () => ['Plan', 'Execute', 'Verify'],
      execute: async (currentRun) => {
        if (currentRun.engine === 'openclaw') {
          const openClawResult = await executeOpenClawAgent({
            ...currentRun.request,
            env,
          });

          if (openClawResult.remoteRunId) {
            currentRun.metadata = {
              ...(currentRun.metadata || {}),
              remoteRunId: openClawResult.remoteRunId,
            };
          }

          return openClawResult.output;
        }

        if (currentRun.engine === 'workflow') {
          return `Workflow-only execution for: ${currentRun.request.message.slice(0, 80)}`;
        }

        const result = await executeCoreChatStream({
          system: currentRun.request.system,
          message: `[Model: ${currentRun.request.model}]\n\n[Provider: ${currentRun.request.provider}]\n\n${currentRun.request.message}`,
          env,
        });

        return readTextStream(result.textStream);
      },
      verify: async (currentRun) => ({
        success: Boolean(currentRun.outputs.at(-1)?.trim()),
        notes: 'Output captured',
      }),
    });

    return Response.json({ runId: run.runId, state: run.state }, { status: 202 });
  } catch (error) {
    logger.error('agent-runs action failed', error);
    return Response.json({ error: 'Failed to process agent run request' }, { status: 500 });
  }
}
