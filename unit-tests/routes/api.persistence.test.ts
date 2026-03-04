import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('~/lib/.server/persistence', () => ({
  isPersistenceEnabled: vi.fn(),
  readPersistedMemory: vi.fn(),
  readPersistedMemoryForUser: vi.fn(),
  upsertPersistedMemory: vi.fn(),
  upsertPersistedMemoryForUser: vi.fn(),
}));

vi.mock('~/lib/.server/auth', () => ({
  getCurrentUserFromRequest: vi.fn(),
}));

import { loader, action } from '~/routes/api.persistence';
import {
  isPersistenceEnabled,
  readPersistedMemory,
  readPersistedMemoryForUser,
  upsertPersistedMemory,
  upsertPersistedMemoryForUser,
} from '~/lib/.server/persistence';
import { getCurrentUserFromRequest } from '~/lib/.server/auth';

describe('/api/persistence route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads user-scoped data for authenticated user', async () => {
    vi.mocked(isPersistenceEnabled).mockReturnValue(true);
    vi.mocked(getCurrentUserFromRequest).mockResolvedValue({
      userId: 'u1',
      username: 'admin',
      isAdmin: true,
      expiresAt: new Date(Date.now() + 60000).toISOString(),
    });
    vi.mocked(readPersistedMemoryForUser).mockResolvedValue({
      apiKeys: { openai: 'key1' },
      providerSettings: {},
      customPrompt: { enabled: true, instructions: 'abc' },
      dbConfig: { provider: 'sqlite', postgresUrl: '' },
    });

    const response = await loader({
      context: { cloudflare: { env: {} } },
      request: new Request('http://localhost/api/persistence'),
    } as any);

    const json = (await response.json()) as any;

    expect(json.enabled).toBe(true);
    expect(json.scope).toBe('user');
    expect(json.apiKeys.openai).toBe('key1');
    expect(readPersistedMemoryForUser).toHaveBeenCalledWith('u1', {});
    expect(readPersistedMemory).not.toHaveBeenCalled();
  });

  it('writes user-scoped values for authenticated user', async () => {
    vi.mocked(isPersistenceEnabled).mockReturnValue(true);
    vi.mocked(getCurrentUserFromRequest).mockResolvedValue({
      userId: 'u1',
      username: 'user',
      isAdmin: false,
      expiresAt: new Date(Date.now() + 60000).toISOString(),
    });

    const response = await action({
      context: { cloudflare: { env: {} } },
      request: new Request('http://localhost/api/persistence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKeys: { openai: 'k' } }),
      }),
    } as any);

    const json = (await response.json()) as any;

    expect(json.ok).toBe(true);
    expect(json.scope).toBe('user');
    expect(upsertPersistedMemoryForUser).toHaveBeenCalledWith('u1', { apiKeys: { openai: 'k' }, providerSettings: undefined, customPrompt: undefined, dbConfig: undefined }, {});
    expect(upsertPersistedMemory).not.toHaveBeenCalled();
  });

  it('returns disabled payload when persistence is off', async () => {
    vi.mocked(isPersistenceEnabled).mockReturnValue(false);

    const response = await loader({
      context: { cloudflare: { env: {} } },
      request: new Request('http://localhost/api/persistence'),
    } as any);

    const json = (await response.json()) as any;
    expect(json.enabled).toBe(false);
  });
});
