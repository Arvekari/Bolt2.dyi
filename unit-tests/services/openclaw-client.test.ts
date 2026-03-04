import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  assertOpenClawToolAllowed,
  cancelOpenClawRun,
  executeOpenClawAgent,
  getOpenClawRunStatus,
  isOpenClawConfigured,
} from '~/lib/.server/extensions/openclaw/openclaw-client';

describe('openclaw-client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('detects configured base url from env', () => {
    expect(isOpenClawConfigured({ OPENCLAW_BASE_URL: 'http://localhost:4444' })).toBe(true);
    expect(isOpenClawConfigured({})).toBe(false);
  });

  it('executes OpenClaw request and returns output + remote run id', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({
      ok: true,
      json: async () => ({ output: 'done', runId: 'oc-123' }),
    } as Response);

    const result = await executeOpenClawAgent({
      system: 'sys',
      message: 'hello',
      model: 'gpt-4o-mini',
      provider: 'OpenAI',
      env: { OPENCLAW_BASE_URL: 'http://localhost:4444' },
    });

    expect(result.output).toBe('done');
    expect(result.remoteRunId).toBe('oc-123');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws when OpenClaw is not configured', async () => {
    await expect(
      executeOpenClawAgent({
        system: 'sys',
        message: 'hello',
        model: 'gpt-4o-mini',
        provider: 'OpenAI',
        env: {},
      }),
    ).rejects.toThrow(/OPENCLAW_BASE_URL/i);
  });

  it('cancels run using remote cancel endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({ ok: true } as Response);

    const cancelled = await cancelOpenClawRun({
      remoteRunId: 'oc-999',
      env: { OPENCLAW_BASE_URL: 'http://localhost:4444' },
    });

    expect(cancelled).toBe(true);
    expect(fetchMock).toHaveBeenCalled();
  });

  it('gets remote run status', async () => {
    vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({
      ok: true,
      json: async () => ({ state: 'running', id: 'oc-777' }),
    } as Response);

    const status = await getOpenClawRunStatus({
      remoteRunId: 'oc-777',
      env: { OPENCLAW_BASE_URL: 'http://localhost:4444' },
    });

    expect(status.state).toBe('running');
    expect(status.remoteRunId).toBe('oc-777');
  });

  it('rejects disallowed tool invocation by env allowlist', () => {
    expect(() =>
      assertOpenClawToolAllowed({
        toolName: 'filesystem.write',
        env: { OPENCLAW_ALLOWED_TOOLS: 'terminal.exec,git.status' },
      }),
    ).toThrow(/not allowed/i);
  });

  it('accepts allowed tool invocation by env allowlist', () => {
    expect(() =>
      assertOpenClawToolAllowed({
        toolName: 'terminal.exec',
        env: { OPENCLAW_ALLOWED_TOOLS: 'terminal.exec,git.status' },
      }),
    ).not.toThrow();
  });
});
