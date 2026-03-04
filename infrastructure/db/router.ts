export type DbBackend = 'sqlite' | 'postgrest';

export function choosePersistenceBackend(input: {
  configuredProvider: DbBackend;
  postgrestReachable: boolean;
  allowFallbackToSqlite: boolean;
}) {
  if (input.configuredProvider === 'sqlite') {
    return {
      active: 'sqlite' as const,
      degraded: false,
      reason: 'sqlite configured',
    };
  }

  if (input.postgrestReachable) {
    return {
      active: 'postgrest' as const,
      degraded: false,
      reason: 'postgrest reachable',
    };
  }

  if (input.allowFallbackToSqlite) {
    return {
      active: 'sqlite' as const,
      degraded: true,
      reason: 'postgrest unreachable, fallback to sqlite',
    };
  }

  return {
    active: 'postgrest' as const,
    degraded: true,
    reason: 'postgrest unreachable and fallback disabled',
  };
}
