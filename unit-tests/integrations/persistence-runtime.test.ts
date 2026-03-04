import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  isPostgrestEnabledMock,
  isSqlitePersistenceEnabledMock,
} = vi.hoisted(() => ({
  isPostgrestEnabledMock: vi.fn(),
  isSqlitePersistenceEnabledMock: vi.fn(),
}));

vi.mock('~/lib/.server/persistence/postgrest-memory', () => ({
  isPostgrestEnabled: isPostgrestEnabledMock,
}));

vi.mock('~/lib/.server/persistence/sqlite-memory', () => ({
  isSqlitePersistenceEnabled: isSqlitePersistenceEnabledMock,
}));

import { getPersistenceRuntimeStatus } from '~/lib/.server/persistence';

describe('persistence runtime status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isPostgrestEnabledMock.mockReturnValue(false);
    isSqlitePersistenceEnabledMock.mockReturnValue(true);
  });

  it('falls back to sqlite when postgrest configured but unavailable and fallback allowed', () => {
    const status = getPersistenceRuntimeStatus({
      BOLT_SERVER_DB_PROVIDER: 'postgres',
      BOLT_DB_FALLBACK_TO_SQLITE: 'true',
      POSTGREST_URL: 'http://postgrest.local',
    });

    expect(status.configuredProvider).toBe('postgrest');
    expect(status.activeProvider).toBe('sqlite');
    expect(status.degraded).toBe(true);
  });

  it('keeps postgrest mode when fallback disabled', () => {
    const status = getPersistenceRuntimeStatus({
      BOLT_SERVER_DB_PROVIDER: 'postgrest',
      BOLT_DB_FALLBACK_TO_SQLITE: 'false',
      POSTGREST_URL: 'http://postgrest.local',
    });

    expect(status.configuredProvider).toBe('postgrest');
    expect(status.activeProvider).toBe('postgrest');
    expect(status.degraded).toBe(true);
  });

  it('uses postgrest when configured and reachable', () => {
    isPostgrestEnabledMock.mockReturnValue(true);

    const status = getPersistenceRuntimeStatus({
      BOLT_SERVER_DB_PROVIDER: 'postgrest',
      POSTGREST_URL: 'http://postgrest.local',
    });

    expect(status.activeProvider).toBe('postgrest');
    expect(status.degraded).toBe(false);
  });
});
