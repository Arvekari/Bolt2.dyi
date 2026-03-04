type EnvMap = Record<string, any>;

function asLower(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

export type PlatformConfig = {
  db: {
    provider: 'sqlite' | 'postgrest';
    allowFallbackToSqlite: boolean;
    postgrestUrl: string;
  };
  integrations: {
    openclaw: {
      enabled: boolean;
      baseUrl?: string;
      timeoutMs: number;
    };
  };
};

export function loadPlatformConfig(env: EnvMap = {}): PlatformConfig {
  const providerRaw = asLower(env.BOLT_SERVER_DB_PROVIDER || 'sqlite');
  const provider = providerRaw === 'postgrest' || providerRaw === 'postgres' ? 'postgrest' : 'sqlite';

  const fallbackRaw = asLower(env.BOLT_DB_FALLBACK_TO_SQLITE || 'true');
  const allowFallbackToSqlite = fallbackRaw !== 'false';

  const openclawBaseUrl = typeof env.OPENCLAW_BASE_URL === 'string' ? env.OPENCLAW_BASE_URL : undefined;
  const openclawTimeout = Number(env.OPENCLAW_TIMEOUT_MS || '30000');

  return {
    db: {
      provider,
      allowFallbackToSqlite,
      postgrestUrl: typeof env.POSTGREST_URL === 'string' ? env.POSTGREST_URL : '',
    },
    integrations: {
      openclaw: {
        enabled: Boolean(openclawBaseUrl),
        baseUrl: openclawBaseUrl,
        timeoutMs: Number.isFinite(openclawTimeout) && openclawTimeout > 0 ? Math.floor(openclawTimeout) : 30000,
      },
    },
  };
}
