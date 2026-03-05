import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createSessionMock, deleteSessionMock, parseCookiesMock } = vi.hoisted(() => ({
  createSessionMock: vi.fn(),
  deleteSessionMock: vi.fn(),
  parseCookiesMock: vi.fn(() => ({})),
}));

vi.mock('~/lib/.server/persistence', () => ({
  createSession: createSessionMock,
  deleteSession: deleteSessionMock,
  getSessionUser: vi.fn(),
}));

vi.mock('~/lib/api/cookies', () => ({
  parseCookies: parseCookiesMock,
}));

import { clearAuthCookies, createAuthCookies } from '~/lib/.server/auth';

describe('server auth cookie security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets Secure on auth cookies in production', async () => {
    createSessionMock.mockResolvedValue({ token: 'session-token' });

    const cookies = await createAuthCookies('u1', { NODE_ENV: 'production' });

    expect(cookies).toHaveLength(2);
    expect(cookies[0]).toContain('HttpOnly');
    expect(cookies[0]).toContain('Secure');
    expect(cookies[1]).toContain('Secure');
  });

  it('does not force Secure in local dev by default', async () => {
    createSessionMock.mockResolvedValue({ token: 'session-token' });

    const cookies = await createAuthCookies('u1', { NODE_ENV: 'development' });

    expect(cookies[0]).not.toContain('Secure');
    expect(cookies[1]).not.toContain('Secure');
  });

  it('clears cookies with Secure directive when docker flag is enabled', async () => {
    parseCookiesMock.mockReturnValue({ bolt_session: 'active-token' });

    const request = new Request('http://localhost/api/auth/logout', {
      headers: {
        Cookie: 'bolt_session=active-token',
      },
    });

    const cookies = await clearAuthCookies(request, { RUNNING_IN_DOCKER: 'true' });

    expect(deleteSessionMock).toHaveBeenCalledWith('active-token', { RUNNING_IN_DOCKER: 'true' });
    expect(cookies[0]).toContain('Max-Age=0');
    expect(cookies[0]).toContain('Secure');
    expect(cookies[1]).toContain('Secure');
  });
});
