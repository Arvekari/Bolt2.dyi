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
    n8n: {
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
  const n8nBaseUrl = typeof env.N8N_BASE_URL === 'string' ? env.N8N_BASE_URL : undefined;
  const n8nApiKey = typeof env.N8N_API_KEY === 'string' ? env.N8N_API_KEY : undefined;
  const n8nTimeout = Number(env.N8N_TIMEOUT_MS || '30000');

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
      n8n: {
        enabled: Boolean(n8nBaseUrl && n8nApiKey),
        baseUrl: n8nBaseUrl,
        timeoutMs: Number.isFinite(n8nTimeout) && n8nTimeout > 0 ? Math.floor(n8nTimeout) : 30000,
      },
    },
  };
}
