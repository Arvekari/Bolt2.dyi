import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AgentRunService } from '~/lib/.server/agents/agentRunService';

describe('AgentRunService', () => {
  beforeEach(() => {
    AgentRunService.getInstance().resetForTests();
  });

  it('creates run and completes plan/execute/verify stages', async () => {
    const service = AgentRunService.getInstance();

    const run = service.createRun({
      request: {
        system: 'sys',
        message: 'Implement feature',
        model: 'gpt-4o-mini',
        provider: 'OpenAI',
      },
      engine: 'llm',
    });

    await service.executeRun(run.runId, {
      timeoutMs: 5000,
      plan: async () => ['step-1', 'step-2'],
      execute: async () => 'execution-output',
      verify: async () => ({ success: true, notes: 'ok' }),
    });

    const updated = service.getRun(run.runId);
    expect(updated).toBeDefined();
    expect(updated?.state).toBe('completed');
    expect(updated?.steps).toHaveLength(3);
    expect(updated?.outputs.some((output) => output.includes('execution-output'))).toBe(true);
  });

  it('marks run as failed and keeps partial progress when execute throws', async () => {
    const service = AgentRunService.getInstance();
    const run = service.createRun({
      request: {
        system: 'sys',
        message: 'failing task',
        model: 'gpt-4o-mini',
        provider: 'OpenAI',
      },
      engine: 'llm',
    });

    await expect(
      service.executeRun(run.runId, {
        timeoutMs: 5000,
        plan: async () => ['planned'],
        execute: async () => {
          throw new Error('execution failed');
        },
      }),
    ).rejects.toThrow('execution failed');

    const updated = service.getRun(run.runId);
    expect(updated?.state).toBe('failed');
    expect(updated?.steps.some((step) => step.state === 'completed')).toBe(true);
    expect(updated?.error?.message).toContain('execution failed');
  });

  it('supports cancellation before execute stage', async () => {
    const service = AgentRunService.getInstance();
    const run = service.createRun({
      request: {
        system: 'sys',
        message: 'cancel me',
        model: 'gpt-4o-mini',
        provider: 'OpenAI',
      },
      engine: 'llm',
    });

    const plan = vi.fn(async () => {
      service.cancelRun(run.runId);
      return ['planned'];
    });

    await expect(
      service.executeRun(run.runId, {
        timeoutMs: 5000,
        plan,
        execute: async () => 'should-not-run',
      }),
    ).rejects.toThrow(/cancelled/i);

    const updated = service.getRun(run.runId);
    expect(updated?.state).toBe('cancelled');
  });
});
