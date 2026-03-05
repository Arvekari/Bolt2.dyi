import { beforeEach, describe, expect, it, vi } from 'vitest';

const { deployN8nWorkflowMock, updateN8nWorkflowMock, isN8nConfiguredMock, readPersistedMemoryMock } = vi.hoisted(() => ({
  deployN8nWorkflowMock: vi.fn(),
  updateN8nWorkflowMock: vi.fn(),
  isN8nConfiguredMock: vi.fn(),
  readPersistedMemoryMock: vi.fn(),
}));

vi.mock('~/lib/.server/extensions/n8n/n8n-client', () => ({
  deployN8nWorkflow: deployN8nWorkflowMock,
  updateN8nWorkflow: updateN8nWorkflowMock,
  isN8nConfigured: isN8nConfiguredMock,
}));

vi.mock('~/lib/.server/persistence', () => ({
  readPersistedMemory: readPersistedMemoryMock,
}));

vi.mock('~/utils/logger', () => ({
  createScopedLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
}));

import { action, loader } from '~/routes/api.n8n.workflows';

describe('/api/n8n/workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isN8nConfiguredMock.mockImplementation((env?: Record<string, string | undefined>) =>
      Boolean(env?.N8N_BASE_URL && env?.N8N_API_KEY),
    );
    readPersistedMemoryMock.mockResolvedValue({});
  });

  it('returns integration status from loader', async () => {
    const response = await loader({
      request: new Request('http://localhost/api/n8n/workflows'),
      context: { cloudflare: { env: { N8N_BASE_URL: 'http://localhost:5678', N8N_API_KEY: 'x' } } },
    } as any);

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.configured).toBe(true);
  });

  it('uses persisted system settings when env vars are missing', async () => {
    readPersistedMemoryMock.mockResolvedValue({
      providerSettings: {
        __systemSettings: {
          n8n: {
            enabled: true,
            baseUrl: 'https://n8n.internal',
            apiKey: 'from-settings',
          },
        },
      },
    });

    deployN8nWorkflowMock.mockResolvedValue({
      workflowId: 'wf-1',
      active: true,
      raw: { id: 'wf-1' },
    });

    const response = await action({
      request: new Request('http://localhost/api/n8n/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'deploy',
          activate: true,
          workflow: { name: 'demo', nodes: [], connections: {} },
        }),
      }),
      context: { cloudflare: { env: {} } },
    } as any);

    expect(response.status).toBe(201);
    expect(deployN8nWorkflowMock).toHaveBeenCalledTimes(1);
    expect(deployN8nWorkflowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        env: expect.objectContaining({
          N8N_BASE_URL: 'https://n8n.internal',
          N8N_API_KEY: 'from-settings',
        }),
      }),
    );
  });

  it('rejects deploy when integration is not configured', async () => {
    isN8nConfiguredMock.mockReturnValue(false);

    const response = await action({
      request: new Request('http://localhost/api/n8n/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: 'deploy', workflow: { name: 'demo', nodes: [], connections: {} } }),
      }),
      context: { cloudflare: { env: {} } },
    } as any);

    expect(response.status).toBe(503);
  });

  it('deploys workflow for intent=deploy', async () => {
    deployN8nWorkflowMock.mockResolvedValue({
      workflowId: 'wf-1',
      active: true,
      raw: { id: 'wf-1' },
    });

    const response = await action({
      request: new Request('http://localhost/api/n8n/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'deploy',
          activate: true,
          workflow: { name: 'demo', nodes: [], connections: {} },
        }),
      }),
      context: { cloudflare: { env: { N8N_BASE_URL: 'http://localhost:5678', N8N_API_KEY: 'x' } } },
    } as any);

    const data = await response.json();
    expect(response.status).toBe(201);
    expect(data.workflowId).toBe('wf-1');
    expect(deployN8nWorkflowMock).toHaveBeenCalledTimes(1);
  });

  it('returns bad request for missing workflow payload', async () => {
    const response = await action({
      request: new Request('http://localhost/api/n8n/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: 'deploy' }),
      }),
      context: { cloudflare: { env: { N8N_BASE_URL: 'http://localhost:5678', N8N_API_KEY: 'x' } } },
    } as any);

    expect(response.status).toBe(400);
  });

  it('returns bad request for invalid n8n workflow shape', async () => {
    const response = await action({
      request: new Request('http://localhost/api/n8n/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'deploy',
          workflow: { name: '', nodes: {}, connections: [] },
        }),
      }),
      context: { cloudflare: { env: { N8N_BASE_URL: 'http://localhost:5678', N8N_API_KEY: 'x' } } },
    } as any);

    expect(response.status).toBe(400);
  });

  it('updates workflow for intent=update', async () => {
    updateN8nWorkflowMock.mockResolvedValue({
      workflowId: 'wf-2',
      active: true,
      raw: { id: 'wf-2' },
    });

    const response = await action({
      request: new Request('http://localhost/api/n8n/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'update',
          workflowId: 'wf-2',
          activate: true,
          workflow: { id: 'wf-2', name: 'demo update', nodes: [], connections: {} },
        }),
      }),
      context: { cloudflare: { env: { N8N_BASE_URL: 'http://localhost:5678', N8N_API_KEY: 'x' } } },
    } as any);

    expect(response.status).toBe(201);
    expect(updateN8nWorkflowMock).toHaveBeenCalledTimes(1);
    expect(updateN8nWorkflowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: 'wf-2',
      }),
    );
  });
});
