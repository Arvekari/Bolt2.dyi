import { describe, expect, it } from 'vitest';

describe('hooks/useNotifications module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/hooks/useNotifications');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});