import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createRunMock,
  executeRunMock,
  listRunsPersistedMock,
  getRunPersistedMock,
  cancelRunMock,
  setEnvironmentMock,
  resetForTestsMock,
  cancelOpenClawRunMock,
  getOpenClawRunStatusMock,
  isOpenClawConfiguredMock,
} = vi.hoisted(() => ({
  createRunMock: vi.fn(),
  executeRunMock: vi.fn(),
  listRunsPersistedMock: vi.fn(),
  getRunPersistedMock: vi.fn(),
  cancelRunMock: vi.fn(),
  setEnvironmentMock: vi.fn(),
  resetForTestsMock: vi.fn(),
  cancelOpenClawRunMock: vi.fn(),
  getOpenClawRunStatusMock: vi.fn(),
  isOpenClawConfiguredMock: vi.fn(),
}));

vi.mock('~/lib/.server/agents/agentRunService', () => ({
  AgentRunService: {
    getInstance: () => ({
      createRun: createRunMock,
      executeRun: executeRunMock,
      listRunsPersisted: listRunsPersistedMock,
      getRunPersisted: getRunPersistedMock,
      cancelRun: cancelRunMock,
      setEnvironment: setEnvironmentMock,
      resetForTests: resetForTestsMock,
    }),
  },
}));

vi.mock('~/lib/.server/extensions/openclaw/openclaw-client', () => ({
  cancelOpenClawRun: cancelOpenClawRunMock,
  getOpenClawRunStatus: getOpenClawRunStatusMock,
  isOpenClawConfigured: isOpenClawConfiguredMock,
  executeOpenClawAgent: vi.fn(),
}));

vi.mock('~/utils/logger', () => ({
  createScopedLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
}));

import { action, loader } from '~/routes/api.agent-runs';

describe('/api/agent-runs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isOpenClawConfiguredMock.mockReturnValue(false);
  });

  it('starts run on intent=start', async () => {
    createRunMock.mockReturnValue({ runId: 'run-1' });
    executeRunMock.mockResolvedValue(undefined);

    const response = await action({
      request: new Request('http://localhost/api/agent-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: 'start', system: 'sys', message: 'msg', model: 'm1', provider: 'OpenAI' }),
      }),
      context: { cloudflare: { env: {} } },
    } as any);

    const data = await response.json();
    expect(response.status).toBe(202);
    expect(data.runId).toBe('run-1');
  });

  it('adds openclaw metadata when configured', async () => {
    isOpenClawConfiguredMock.mockReturnValue(true);
    createRunMock.mockReturnValue({ runId: 'run-openclaw' });

    const response = await action({
      request: new Request('http://localhost/api/agent-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'start',
          engine: 'openclaw',
          system: 'sys',
          message: 'msg',
          model: 'm1',
          provider: 'OpenAI',
        }),
      }),
      context: { cloudflare: { env: { OPENCLAW_BASE_URL: 'http://openclaw.local' } } },
    } as any);

    expect(response.status).toBe(202);
    expect(createRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          openClawConfigured: true,
        }),
      }),
    );
  });

  it('cancels run on intent=cancel and delegates remote cancel for openclaw run', async () => {
    cancelRunMock.mockReturnValue(true);
    getRunPersistedMock.mockResolvedValue({
      runId: 'run-1',
      engine: 'openclaw',
      metadata: { remoteRunId: 'oc-1' },
    });
    cancelOpenClawRunMock.mockResolvedValue(true);

    const response = await action({
      request: new Request('http://localhost/api/agent-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: 'cancel', runId: 'run-1' }),
      }),
      context: { cloudflare: { env: { OPENCLAW_BASE_URL: 'http://openclaw.local' } } },
    } as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.cancelled).toBe(true);
    expect(cancelOpenClawRunMock).toHaveBeenCalledWith(
      expect.objectContaining({ remoteRunId: 'oc-1' }),
    );
  });

  it('returns persisted run status by runId', async () => {
    getRunPersistedMock.mockResolvedValue({ runId: 'run-2', state: 'executing' });

    const response = await loader({
      request: new Request('http://localhost/api/agent-runs?runId=run-2'),
    } as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.runId).toBe('run-2');
  });

  it('includes remote status for openclaw run with remoteRunId', async () => {
    getRunPersistedMock.mockResolvedValue({
      runId: 'run-oc',
      state: 'executing',
      engine: 'openclaw',
      metadata: { remoteRunId: 'oc-99' },
    });
    getOpenClawRunStatusMock.mockResolvedValue({
      remoteRunId: 'oc-99',
      state: 'running',
      raw: { state: 'running' },
    });

    const response = await loader({
      request: new Request('http://localhost/api/agent-runs?runId=run-oc'),
      context: { cloudflare: { env: { OPENCLAW_BASE_URL: 'http://openclaw.local' } } },
    } as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.remoteStatus.state).toBe('running');
  });

  it('returns persisted list when runId is missing', async () => {
    listRunsPersistedMock.mockResolvedValue([{ runId: 'run-a' }]);

    const response = await loader({
      request: new Request('http://localhost/api/agent-runs'),
    } as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data.runs)).toBe(true);
    expect(data.runs[0].runId).toBe('run-a');
  });
});
