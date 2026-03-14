#!/usr/bin/env node

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPEN_AI_APIKEY;
const openAiTimeoutMs = Number(process.env.OPENAI_SMOKE_TIMEOUT_MS || process.env.AI_SMOKE_TIMEOUT_MS || 30000);
const ollamaBaseUrl = (process.env.OLLAMA_API_BASE_URL || process.env.OLLAMA_BASE_URL || '').trim().replace(/\/$/, '');
const ollamaTimeoutMs = Number(process.env.OLLAMA_SMOKE_TIMEOUT_MS || process.env.LOCAL_AI_SMOKE_TIMEOUT_MS || 300000);
const preferredOllamaModel = (process.env.OLLAMA_SMOKE_MODEL || process.env.OLLAMA_MODEL || '').trim();
const preferredOllamaModels = ['mistral:7b', 'deepseek-coder:6.7b', 'qwen2.5:7b', 'llama3.2:3b'];

function withTimeout(signalTimeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), signalTimeoutMs);

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  };
}

async function parseJsonResponse(response) {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return await response.json();
}

async function callOpenAI(path, body) {
  const timer = withTimeout(openAiTimeoutMs);

  try {
    const response = await fetch(`https://api.openai.com/v1${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: timer.signal,
    });

    return await parseJsonResponse(response);
  } finally {
    timer.clear();
  }
}

async function callOllama(path, body, timeoutMs = ollamaTimeoutMs) {
  const timer = withTimeout(timeoutMs);

  try {
    const response = await fetch(`${ollamaBaseUrl}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: timer.signal,
    });

    return await parseJsonResponse(response);
  } finally {
    timer.clear();
  }
}

function selectOllamaModel(models) {
  if (preferredOllamaModel) {
    return preferredOllamaModel;
  }

  for (const preferredModel of preferredOllamaModels) {
    if (models.includes(preferredModel)) {
      return preferredModel;
    }
  }

  return models[0];
}

async function runOllamaSmoke() {
  if (!ollamaBaseUrl) {
    console.log('OLLAMA_API_BASE_URL/OLLAMA_BASE_URL not found; skipping live Ollama smoke checks.');
    return false;
  }

  console.log(`Running live Ollama smoke checks against ${ollamaBaseUrl}...`);

  const tags = await callOllama('/api/tags', null, 30000);
  const availableModels = Array.isArray(tags.models) ? tags.models.map((model) => model.name).filter(Boolean) : [];

  if (availableModels.length === 0) {
    throw new Error('Ollama is reachable but returned no models from /api/tags.');
  }

  const selectedModel = selectOllamaModel(availableModels);

  if (!selectedModel) {
    throw new Error('Unable to select an Ollama model for smoke testing.');
  }

  await callOllama('/v1/chat/completions', {
    model: selectedModel,
    messages: [{ role: 'user', content: 'Reply with exactly: ok' }],
    max_tokens: 12,
    temperature: 0,
    stream: false,
  });

  console.log(`✅ Live Ollama smoke checks passed for ${selectedModel}.`);
  return true;
}

async function run() {
  let checksRun = 0;

  if (OPENAI_API_KEY) {
    console.log('Running live AI smoke checks (OpenAI key present)...');

    await callOpenAI('/chat/completions', {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Reply with exactly: ok' }],
      max_tokens: 12,
      temperature: 0,
    });

    await callOpenAI('/responses', {
      model: 'gpt-5.3-codex',
      input: 'Reply with exactly: ok',
      max_output_tokens: 16,
    });

    console.log('✅ Live OpenAI smoke checks passed for gpt-4o and gpt-5.3-codex.');
    checksRun += 1;
  } else {
    console.log('OPENAI_API_KEY/OPEN_AI_APIKEY not found; skipping live OpenAI smoke checks.');
  }

  if (await runOllamaSmoke()) {
    checksRun += 1;
  }

  if (checksRun === 0) {
    console.log('No live AI smoke targets configured; skipping.');
    process.exit(0);
  }
}

run().catch((error) => {
  const details = error instanceof Error ? error.message : String(error);
  console.error(`❌ AI smoke check failed: ${details}`);
  process.exit(1);
});