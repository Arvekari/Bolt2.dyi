import { describe, expect, it } from 'vitest';

describe('llm/types module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/modules/llm/types');
    expect(module).toBeDefined();
  });
});