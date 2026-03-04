import { describe, expect, it } from 'vitest';

import { checkRateLimit } from '~/platform/security/rate-limit';

describe('rate-limit', () => {
  it('allows requests under limit and blocks above limit within window', () => {
    const key = 'ip:127.0.0.1';
    const now = 1_700_000_000_000;

    const first = checkRateLimit({ key, limit: 2, windowMs: 60_000, now });
    const second = checkRateLimit({ key, limit: 2, windowMs: 60_000, now: now + 1000 });
    const third = checkRateLimit({ key, limit: 2, windowMs: 60_000, now: now + 2000 });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
  });

  it('resets allowance after window has passed', () => {
    const key = 'ip:127.0.0.2';
    const now = 1_700_000_000_000;

    checkRateLimit({ key, limit: 1, windowMs: 1000, now });
    const afterWindow = checkRateLimit({ key, limit: 1, windowMs: 1000, now: now + 1001 });

    expect(afterWindow.allowed).toBe(true);
  });
});
