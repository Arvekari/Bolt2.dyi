import { describe, expect, it } from 'vitest';
import { loader } from '~/routes/api.health';

describe('/api/health', () => {
  it('returns healthy status with timestamp', async () => {
    const response = await loader({
      request: new Request('http://localhost/api/health'),
      context: {} as any,
      params: {},
    } as any);

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.status).toBe('healthy');
    expect(typeof data.timestamp).toBe('string');
    expect(typeof data.requestId).toBe('string');
    expect(typeof data.checks).toBe('object');
    expect(typeof data.checks.persistence).toBe('string');
    expect(typeof data.checks.dbProvider).toBe('string');
    expect(typeof data.checks.openclaw).toBe('string');
    expect(typeof data.checks.fallback).toBe('string');
    expect(Number.isNaN(Date.parse(data.timestamp))).toBe(false);
  });
});
