import { describe, expect, it } from 'vitest';

import { loadPlatformConfig } from '~/infrastructure/config/loader';

describe('config loader', () => {
  it('defaults to sqlite and graceful fallback', () => {
    const config = loadPlatformConfig({});

    expect(config.db.provider).toBe('sqlite');
    expect(config.db.allowFallbackToSqlite).toBe(true);
    expect(config.integrations.openclaw.enabled).toBe(false);
  });

  it('accepts postgrest/postgres provider aliases', () => {
    const pgConfig = loadPlatformConfig({ BOLT_SERVER_DB_PROVIDER: 'postgres', POSTGREST_URL: 'http://x' });
    const postgrestConfig = loadPlatformConfig({ BOLT_SERVER_DB_PROVIDER: 'postgrest', POSTGREST_URL: 'http://x' });

    expect(pgConfig.db.provider).toBe('postgrest');
    expect(postgrestConfig.db.provider).toBe('postgrest');
  });

  it('enables openclaw when base url exists', () => {
    const config = loadPlatformConfig({ OPENCLAW_BASE_URL: 'http://localhost:3333' });
    expect(config.integrations.openclaw.enabled).toBe(true);
  });
});
