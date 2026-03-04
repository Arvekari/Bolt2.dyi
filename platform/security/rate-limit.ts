type RateLimitEntry = {
  count: number;
  windowStart: number;
};

type CheckRateLimitInput = {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

const bucket = new Map<string, RateLimitEntry>();

export function checkRateLimit(input: CheckRateLimitInput): RateLimitResult {
  const now = input.now ?? Date.now();
  const existing = bucket.get(input.key);

  if (!existing || now - existing.windowStart >= input.windowMs) {
    bucket.set(input.key, { count: 1, windowStart: now });

    return {
      allowed: true,
      remaining: Math.max(0, input.limit - 1),
      resetAt: now + input.windowMs,
    };
  }

  if (existing.count >= input.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.windowStart + input.windowMs,
    };
  }

  existing.count += 1;
  bucket.set(input.key, existing);

  return {
    allowed: true,
    remaining: Math.max(0, input.limit - existing.count),
    resetAt: existing.windowStart + input.windowMs,
  };
}

export function getRateLimitPolicy(env?: Record<string, any>) {
  const limit = Number(env?.BOLT_API_RATE_LIMIT_PER_MINUTE || '120');
  const validLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 120;

  return {
    limit: validLimit,
    windowMs: 60_000,
  };
}
