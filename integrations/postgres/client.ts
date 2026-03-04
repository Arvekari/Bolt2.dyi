export function isPostgresConfigured(env?: Record<string, any>): boolean {
  const value = (env?.BOLT_SERVER_DB_PROVIDER || (globalThis as any)?.process?.env?.BOLT_SERVER_DB_PROVIDER || 'sqlite')
    .toString()
    .toLowerCase();

  return value === 'postgres' || value === 'postgrest';
}
