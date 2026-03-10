const endpoint = 'http://localhost:5173/api/chat';

function timeoutAfter(ms, label) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout: ${label} after ${ms}ms`)), ms));
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY missing in environment');
  }

  const prompt = 'Reply with exactly STREAM_SMOKE_OK and then one short sentence.';
  const apiKeysCookie = encodeURIComponent(JSON.stringify({ OpenAI: apiKey }));
  const body = {
    messages: [
      {
        id: 'smoke-user-1',
        role: 'user',
        content: `[Model: gpt-3.5-turbo]\n\n[Provider: OpenAI]\n\n${prompt}`,
      },
    ],
    files: {},
    contextOptimization: false,
    chatMode: 'build',
    maxLLMSteps: 1,
  };

  const startedAt = Date.now();
  const response = await Promise.race(
    [
      fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `apiKeys=${apiKeysCookie}; selectedProvider=OpenAI; selectedModel=gpt-3.5-turbo`,
        },
        body: JSON.stringify(body),
      }),
      timeoutAfter(20000, 'request start'),
    ],
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text.slice(0, 500)}`);
  }

  if (!response.body) {
    throw new Error('No response body stream');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let fullText = '';
  let chunkCount = 0;
  let firstChunkAt = 0;
  let sawTextChunk = false;

  while (true) {
    const { done, value } = await Promise.race([reader.read(), timeoutAfter(30000, 'stream read')]);

    if (done) {
      break;
    }

    chunkCount += 1;

    if (!firstChunkAt) {
      firstChunkAt = Date.now();
    }

    fullText += decoder.decode(value, { stream: true });

    if (fullText.includes('0:')) {
      sawTextChunk = true;
    }

    if (fullText.includes('STREAM_SMOKE_OK') || (sawTextChunk && fullText.length > 1200)) {
      break;
    }
  }

  const elapsed = Date.now() - startedAt;
  const firstChunkMs = firstChunkAt ? firstChunkAt - startedAt : -1;

  if (!sawTextChunk) {
    const excerpt = fullText.slice(0, 600);
    throw new Error(`No streamed text chunk detected. chunks=${chunkCount} bytes=${fullText.length} excerpt=${excerpt}`);
  }

  console.log(JSON.stringify({
    ok: true,
    endpoint,
    chunkCount,
    elapsedMs: elapsed,
    firstChunkMs,
    markerFound: fullText.includes('STREAM_SMOKE_OK'),
    sawTextChunk,
  }));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: String(error?.message || error) }));
  process.exit(1);
});
