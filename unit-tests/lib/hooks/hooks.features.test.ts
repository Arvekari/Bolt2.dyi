import { describe, expect, it } from 'vitest';

describe('hooks/useFeatures module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/hooks/useFeatures');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});