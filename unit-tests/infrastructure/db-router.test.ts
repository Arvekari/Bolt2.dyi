import { describe, expect, it } from 'vitest';

import { choosePersistenceBackend } from '~/infrastructure/db/router';

describe('db router', () => {
  it('returns sqlite when provider is sqlite', () => {
    const selected = choosePersistenceBackend({
      configuredProvider: 'sqlite',
      postgrestReachable: false,
      allowFallbackToSqlite: true,
    });

    expect(selected.active).toBe('sqlite');
    expect(selected.degraded).toBe(false);
  });

  it('returns postgrest when configured and reachable', () => {
    const selected = choosePersistenceBackend({
      configuredProvider: 'postgrest',
      postgrestReachable: true,
      allowFallbackToSqlite: true,
    });

    expect(selected.active).toBe('postgrest');
    expect(selected.degraded).toBe(false);
  });

  it('falls back to sqlite when configured postgrest is unreachable and fallback is allowed', () => {
    const selected = choosePersistenceBackend({
      configuredProvider: 'postgrest',
      postgrestReachable: false,
      allowFallbackToSqlite: true,
    });

    expect(selected.active).toBe('sqlite');
    expect(selected.degraded).toBe(true);
    expect(selected.reason).toContain('fallback');
  });

  it('keeps postgrest mode when fallback disabled', () => {
    const selected = choosePersistenceBackend({
      configuredProvider: 'postgrest',
      postgrestReachable: false,
      allowFallbackToSqlite: false,
    });

    expect(selected.active).toBe('postgrest');
    expect(selected.degraded).toBe(true);
  });
});
