import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('~/lib/.server/auth', () => ({
  createAuthCookies: vi.fn(),
  hashPassword: vi.fn(),
}));

vi.mock('~/lib/.server/persistence', () => ({
  findUserByUsername: vi.fn(),
}));

import { action } from '~/routes/api.auth.login';
import { createAuthCookies, hashPassword } from '~/lib/.server/auth';
import { findUserByUsername } from '~/lib/.server/persistence';

describe('/api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when username or password missing', async () => {
    const response = await action({
      request: new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: '', password: '' }),
      }),
      context: { cloudflare: { env: {} } },
    } as any);

    expect(response.status).toBe(400);
  });

  it('returns 401 when user not found', async () => {
    vi.mocked(findUserByUsername).mockResolvedValue(null);

    const response = await action({
      request: new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'alice', password: 'password123' }),
      }),
      context: { cloudflare: { env: {} } },
    } as any);

    expect(response.status).toBe(401);
  });

  it('returns 200 and sets cookies on success', async () => {
    vi.mocked(findUserByUsername).mockResolvedValue({
      id: 'u1',
      username: 'alice',
      passwordSalt: 'salt',
      passwordHash: 'hashed',
      isAdmin: false,
    } as any);
    vi.mocked(hashPassword).mockResolvedValue('hashed');
    vi.mocked(createAuthCookies).mockResolvedValue(['a=1; Path=/']);

    const response = await action({
      request: new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'Alice', password: 'password123' }),
      }),
      context: { cloudflare: { env: {} } },
    } as any);

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(hashPassword).toHaveBeenCalledWith('password123', 'salt');
  });

  it('returns JSON 500 when persistence lookup throws', async () => {
    vi.mocked(findUserByUsername).mockRejectedValue(new Error('backend unavailable'));

    const response = await action({
      request: new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'alice', password: 'password123' }),
      }),
      context: { cloudflare: { env: {} } },
    } as any);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.ok).toBe(false);
    expect(typeof data.error).toBe('string');
  });
});
