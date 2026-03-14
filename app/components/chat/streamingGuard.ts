export const DEFAULT_STREAM_STALL_TIMEOUT_MS = 45000; // 45 seconds of no data (not total elapsed)
export const LOCAL_PROVIDER_STREAM_STALL_TIMEOUT_MS = 120000; // 120 seconds for local/self-hosted models

const LOCAL_PROVIDER_NAMES = new Set(['Ollama', 'LMStudio', 'OpenAILike']);

export function getStreamingStallTimeoutMs(providerName?: string | null) {
  if (providerName && LOCAL_PROVIDER_NAMES.has(providerName)) {
    return LOCAL_PROVIDER_STREAM_STALL_TIMEOUT_MS;
  }

  return DEFAULT_STREAM_STALL_TIMEOUT_MS;
}

export function isStreamingStalled(
  startedAtMs: number | null,
  lastChunkAtMs: number | null,
  nowMs: number,
  timeoutMs = DEFAULT_STREAM_STALL_TIMEOUT_MS,
) {
  // If stream never started or never received any data, can't determine stall
  if (!startedAtMs || startedAtMs <= 0) {
    return false;
  }

  /*
   * Use last chunk time if available, otherwise use start time
   * This way we measure "time since last data" not "total elapsed time"
   */
  const relevantTimeMs = lastChunkAtMs && lastChunkAtMs > startedAtMs ? lastChunkAtMs : startedAtMs;

  return nowMs - relevantTimeMs >= timeoutMs;
}

export function resolveEffectiveStreamingState(params: { isLoading: boolean; fakeLoading: boolean; stalled: boolean }) {
  const isStreaming = params.isLoading || params.fakeLoading;
  return isStreaming && !params.stalled;
}
