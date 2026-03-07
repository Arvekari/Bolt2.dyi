#!/usr/bin/env node

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const requestTimeoutMs = Number(process.env.AI_SMOKE_TIMEOUT_MS || 30000);

function withTimeout(signalTimeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), signalTimeoutMs);

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  };
}

async function callOpenAI(path, body) {
  const timer = withTimeout(requestTimeoutMs);

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

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    return await response.json();
  } finally {
    timer.clear();
  }
}

async function run() {
  if (!OPENAI_API_KEY) {
    console.log('OPENAI_API_KEY not found; skipping live AI smoke checks.');
    process.exit(0);
  }

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
    max_output_tokens: 12,
  });

  console.log('✅ Live AI smoke checks passed for gpt-4o and gpt-5.3-codex.');
}

run().catch((error) => {
  const details = error instanceof Error ? error.message : String(error);
  console.error(`❌ AI smoke check failed: ${details}`);
  process.exit(1);
});