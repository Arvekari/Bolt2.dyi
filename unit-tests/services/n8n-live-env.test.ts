import { describe, expect, it } from 'vitest';

const endpoint = (process.env.n8n_Arvekari_endpoint || process.env.N8N_BASE_URL || '').trim();
const apiKey = (process.env.n8n_Arvekari_ApiKey || process.env.N8N_API_KEY || '').trim();
const hasLiveN8n = Boolean(endpoint && apiKey);

const suite = hasLiveN8n ? describe : describe.skip;

suite('n8n live env smoke (env-gated)', () => {
  it('connects to n8n workflows endpoint when env vars are populated', async () => {
    const baseUrl = endpoint.replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/api/v1/workflows?limit=1`, {
      headers: {
        Accept: 'application/json',
        'X-N8N-API-KEY': apiKey,
      },
    });

    expect(response.ok).toBe(true);

    const body = (await response.json()) as { data?: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
  });
});
