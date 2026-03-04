type EnvLike = Record<string, string | undefined> | undefined;

export type N8nDeployInput = {
  workflow: Record<string, unknown>;
  activate?: boolean;
  env?: EnvLike;
  signal?: AbortSignal;
};

export type N8nDeployResult = {
  workflowId: string;
  active: boolean;
  raw: Record<string, unknown>;
};

function getEnvValue(env: EnvLike, key: string): string | undefined {
  const processEnv = (globalThis as any)?.process?.env;
  const value = env?.[key] ?? processEnv?.[key];
  return typeof value === 'string' ? value : undefined;
}

function getBaseUrl(env?: EnvLike): string {
  const baseUrl = getEnvValue(env, 'N8N_BASE_URL');

  if (!baseUrl) {
    throw new Error('N8N_BASE_URL is not configured');
  }

  return baseUrl.replace(/\/$/, '');
}

function getApiKey(env?: EnvLike): string {
  const apiKey = getEnvValue(env, 'N8N_API_KEY');

  if (!apiKey) {
    throw new Error('N8N_API_KEY is not configured');
  }

  return apiKey;
}

function getTimeoutMs(env?: EnvLike): number {
  const raw = getEnvValue(env, 'N8N_TIMEOUT_MS') || '30000';
  const timeout = Number(raw);
  return Number.isFinite(timeout) && timeout > 0 ? Math.floor(timeout) : 30000;
}

function withTimeoutController(env?: EnvLike, externalSignal?: AbortSignal) {
  const timeoutMs = getTimeoutMs(env);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  return {
    signal: controller.signal,
    timeoutId,
  };
}

function getWorkflowId(payload: Record<string, unknown>): string {
  const value = payload.id;

  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  throw new Error('n8n workflow id missing from create response');
}

export function isN8nConfigured(env?: EnvLike): boolean {
  return Boolean(getEnvValue(env, 'N8N_BASE_URL') && getEnvValue(env, 'N8N_API_KEY'));
}

export async function deployN8nWorkflow(input: N8nDeployInput): Promise<N8nDeployResult> {
  const baseUrl = getBaseUrl(input.env);
  const apiKey = getApiKey(input.env);
  const { signal, timeoutId } = withTimeoutController(input.env, input.signal);

  const createResponse = await fetch(`${baseUrl}/api/v1/workflows`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': apiKey,
    },
    body: JSON.stringify(input.workflow),
    signal,
  }).finally(() => {
    clearTimeout(timeoutId);
  });

  if (!createResponse.ok) {
    throw new Error(`n8n create workflow failed with ${createResponse.status}`);
  }

  const created = (await createResponse.json()) as Record<string, unknown>;
  const workflowId = getWorkflowId(created);

  if (!input.activate) {
    return {
      workflowId,
      active: Boolean(created.active),
      raw: created,
    };
  }

  const { signal: activateSignal, timeoutId: activateTimeoutId } = withTimeoutController(input.env, input.signal);
  const activateResponse = await fetch(`${baseUrl}/api/v1/workflows/${encodeURIComponent(workflowId)}/activate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': apiKey,
    },
    signal: activateSignal,
  }).finally(() => {
    clearTimeout(activateTimeoutId);
  });

  if (!activateResponse.ok) {
    throw new Error(`n8n activate workflow failed with ${activateResponse.status}`);
  }

  const activated = (await activateResponse.json()) as Record<string, unknown>;

  return {
    workflowId,
    active: activated.active === undefined ? true : Boolean(activated.active),
    raw: {
      created,
      activated,
    },
  };
}
