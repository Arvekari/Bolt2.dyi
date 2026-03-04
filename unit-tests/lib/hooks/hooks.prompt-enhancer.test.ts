import { describe, expect, it } from 'vitest';

describe('hooks/usePromptEnhancer module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/hooks/usePromptEnhancer');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});