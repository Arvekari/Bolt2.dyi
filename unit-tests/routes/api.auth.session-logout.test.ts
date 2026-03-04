import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('~/lib/.server/auth', () => ({
  getCurrentUserFromRequest: vi.fn(),
  clearAuthCookies: vi.fn(),
}));

vi.mock('~/lib/.server/persistence', () => ({
  getUserCount: vi.fn(),
}));

import { loader as sessionLoader } from '~/routes/api.auth.session';
import { action as logoutAction } from '~/routes/api.auth.logout';
import { getCurrentUserFromRequest, clearAuthCookies } from '~/lib/.server/auth';
import { getUserCount } from '~/lib/.server/persistence';

describe('/api/auth/session + /api/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unauthenticated session payload', async () => {
    vi.mocked(getCurrentUserFromRequest).mockResolvedValue(null);
    vi.mocked(getUserCount).mockResolvedValue(0);

    const response = await sessionLoader({
      request: new Request('http://localhost/api/auth/session'),
      context: { cloudflare: { env: {} } },
    } as any);

    const data = await response.json();
    expect(data.authenticated).toBe(false);
    expect(data.requireSignup).toBe(true);
    expect(data.user).toBeNull();
  });

  it('returns authenticated session payload', async () => {
    vi.mocked(getCurrentUserFromRequest).mockResolvedValue({
      userId: 'u1',
      username: 'admin',
      isAdmin: true,
      expiresAt: new Date(Date.now() + 60000).toISOString(),
    } as any);
    vi.mocked(getUserCount).mockResolvedValue(2);

    const response = await sessionLoader({
      request: new Request('http://localhost/api/auth/session'),
      context: { cloudflare: { env: {} } },
    } as any);

    const data = await response.json();
    expect(data.authenticated).toBe(true);
    expect(data.requireSignup).toBe(false);
    expect(data.user.username).toBe('admin');
  });

  it('returns unauthenticated fallback payload when user-count lookup fails', async () => {
    vi.mocked(getCurrentUserFromRequest).mockResolvedValue(null);
    vi.mocked(getUserCount).mockRejectedValue(new Error('postgrest unreachable'));

    const response = await sessionLoader({
      request: new Request('http://localhost/api/auth/session'),
      context: { cloudflare: { env: {} } },
    } as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.authenticated).toBe(false);
    expect(data.requireSignup).toBe(true);
  });

  it('clears auth cookies on logout', async () => {
    vi.mocked(clearAuthCookies).mockResolvedValue(['bolt_session=; Max-Age=0']);

    const response = await logoutAction({
      request: new Request('http://localhost/api/auth/logout', { method: 'POST' }),
      context: { cloudflare: { env: {} } },
    } as any);

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
  });
});
