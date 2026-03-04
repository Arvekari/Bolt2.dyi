import { describe, expect, it } from 'vitest';

describe('services/mcpService module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/services/mcpService');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});