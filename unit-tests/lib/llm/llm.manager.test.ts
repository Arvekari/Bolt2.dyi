import { describe, expect, it } from 'vitest';

describe('llm/manager module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/modules/llm/manager');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});