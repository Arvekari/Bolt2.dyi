import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { getClientIp, getRequestId, logApiRequest } from '~/platform/http/request-context';
import { toErrorResponse } from '~/platform/http/error-handler';
import { checkRateLimit, getRateLimitPolicy } from '~/platform/security/rate-limit';

export function enforceRateLimit(args: ActionFunctionArgs, keySuffix: string) {
  const requestId = getRequestId(args.request);
  const clientIp = getClientIp(args.request);
  const env = args.context.cloudflare?.env as Record<string, any> | undefined;

  const policy = getRateLimitPolicy(env);
  const result = checkRateLimit({
    key: `${clientIp}:${keySuffix}`,
    limit: policy.limit,
    windowMs: policy.windowMs,
  });

  logApiRequest(requestId, args.request, {
    rateLimitAllowed: result.allowed,
    rateLimitRemaining: result.remaining,
  });

  if (!result.allowed) {
    return {
      requestId,
      blockedResponse: toErrorResponse({
        requestId,
        status: 429,
        message: 'Rate limit exceeded',
        details: {
          resetAt: result.resetAt,
        },
      }),
    };
  }

  return {
    requestId,
    blockedResponse: null as Response | null,
  };
}
