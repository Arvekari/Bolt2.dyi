import { describe, expect, it } from 'vitest';

import { loader } from '~/routes/api.metrics';

describe('/api/metrics', () => {
  it('returns basic runtime metrics', async () => {
    const response = await loader({
      request: new Request('http://localhost/api/metrics'),
      context: {} as any,
      params: {},
    } as any);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(typeof data.metrics.uptimeSeconds).toBe('number');
    expect(typeof data.metrics.timestamp).toBe('string');
  });
});
