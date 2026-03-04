import { describe, expect, it } from 'vitest';
import { action } from '~/routes/api.update';

describe('/api/update', () => {
  it('returns 405 for non-POST methods', async () => {
    const response = await action({ request: new Request('http://localhost/api/update', { method: 'GET' }) } as any);
    const typedResponse = response as Response;
    expect(typedResponse.status).toBe(405);
    const data = (await typedResponse.json()) as any;
    expect(data.error).toBe('Method not allowed');
  });

  it('returns manual update instructions for POST', async () => {
    const response = await action({ request: new Request('http://localhost/api/update', { method: 'POST' }) } as any);
    const typedResponse = response as Response;
    expect(typedResponse.status).toBe(400);
    const data = (await typedResponse.json()) as any;
    expect(data.error).toContain('Updates must be performed manually');
    expect(Array.isArray(data.instructions)).toBe(true);
    expect(data.instructions.length).toBeGreaterThan(0);
  });
});
