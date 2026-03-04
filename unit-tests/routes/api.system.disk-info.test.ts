import { describe, expect, it } from 'vitest';

describe('/api/system/disk-info', () => {
  it('returns environment-unavailable error payload in test mode', async () => {
    const mod = await import('~/routes/api.system.disk-info');
    const response = await mod.loader({ request: new Request('http://localhost/api/system/disk-info') } as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].error).toBeDefined();
  });

  it('returns mock disk data in development mode', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const modulePath = 'file://' + process.cwd().replace(/\\/g, '/') + '/app/routes/api.system.disk-info.ts?dev=' + Date.now();
    const mod = await import(modulePath);
    const response = await mod.action({ request: new Request('http://localhost/api/system/disk-info', { method: 'POST' }) } as any);
    const data = await response.json();

    process.env.NODE_ENV = prev;

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].filesystem).toBeDefined();
  });
});
