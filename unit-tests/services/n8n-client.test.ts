import { beforeEach, describe, expect, it, vi } from 'vitest';

import { deployN8nWorkflow, isN8nConfigured, updateN8nWorkflow } from '~/lib/.server/extensions/n8n/n8n-client';

describe('n8n-client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('detects configured n8n integration from env', () => {
    expect(isN8nConfigured({ N8N_BASE_URL: 'http://localhost:5678', N8N_API_KEY: 'secret' })).toBe(true);
    expect(isN8nConfigured({ N8N_BASE_URL: 'http://localhost:5678' })).toBe(false);
    expect(isN8nConfigured({ N8N_API_KEY: 'secret' })).toBe(false);
  });

  it('creates workflow and returns deployment metadata', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'wf-123', active: false, name: 'demo' }),
    } as Response);

    const result = await deployN8nWorkflow({
      workflow: { name: 'demo', nodes: [], connections: {} },
      env: { N8N_BASE_URL: 'http://localhost:5678', N8N_API_KEY: 'secret' },
    });

    expect(result.workflowId).toBe('wf-123');
    expect(result.active).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('activates workflow when activate flag is true', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch' as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'wf-999', active: false }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'wf-999', active: true }),
      } as Response);

    const result = await deployN8nWorkflow({
      workflow: { name: 'demo', nodes: [], connections: {} },
      activate: true,
      env: { N8N_BASE_URL: 'http://localhost:5678', N8N_API_KEY: 'secret' },
    });

    expect(result.workflowId).toBe('wf-999');
    expect(result.active).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws when n8n integration is not configured', async () => {
    await expect(
      deployN8nWorkflow({
        workflow: { name: 'demo', nodes: [], connections: {} },
        env: {},
      }),
    ).rejects.toThrow(/N8N_BASE_URL|N8N_API_KEY/i);
  });

  it('throws on n8n API errors', async () => {
    vi.spyOn(globalThis, 'fetch' as any).mockResolvedValueOnce({ ok: false, status: 500 } as Response);

    await expect(
      deployN8nWorkflow({
        workflow: { name: 'demo', nodes: [], connections: {} },
        env: { N8N_BASE_URL: 'http://localhost:5678', N8N_API_KEY: 'secret' },
      }),
    ).rejects.toThrow(/n8n.*500/i);
  });

  it('updates workflow and returns metadata', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'wf-123', active: true, name: 'demo updated' }),
    } as Response);

    const result = await updateN8nWorkflow({
      workflowId: 'wf-123',
      workflow: { id: 'wf-123', name: 'demo updated', nodes: [], connections: {} },
      env: { N8N_BASE_URL: 'http://localhost:5678', N8N_API_KEY: 'secret' },
    });

    expect(result.workflowId).toBe('wf-123');
    expect(result.active).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('activates updated workflow when activate flag is true', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch' as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'wf-999', active: false }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'wf-999', active: true }),
      } as Response);

    const result = await updateN8nWorkflow({
      workflowId: 'wf-999',
      workflow: { id: 'wf-999', name: 'demo updated', nodes: [], connections: {} },
      activate: true,
      env: { N8N_BASE_URL: 'http://localhost:5678', N8N_API_KEY: 'secret' },
    });

    expect(result.workflowId).toBe('wf-999');
    expect(result.active).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws when update workflow id is missing', async () => {
    await expect(
      updateN8nWorkflow({
        workflow: { name: 'demo', nodes: [], connections: {} },
        env: { N8N_BASE_URL: 'http://localhost:5678', N8N_API_KEY: 'secret' },
      }),
    ).rejects.toThrow(/workflowId.*required/i);
  });
});
