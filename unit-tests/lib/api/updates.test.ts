import { afterEach, describe, expect, it, vi } from 'vitest';

import { checkForUpdates, requestSelfUpdate } from '~/lib/api/updates';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('lib/api/updates', () => {
  it('reports update availability with source and currentVersion', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ version: '1.0.0', name: 'opurion' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ version: '1.1.0', name: 'opurion' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ) as any;

    const result = await checkForUpdates();

    expect(result.available).toBe(true);
    expect(result.currentVersion).toBe('1.0.0');
    expect(result.version).toBe('1.1.0');
    expect(result.source).toBe('Arvekari/Opurion');
  });

  it('sends auto intent payload for self-update requests', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, message: 'started' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as any;

    const result = await requestSelfUpdate('1.2.3');

    expect(result.ok).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/update',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });
});
