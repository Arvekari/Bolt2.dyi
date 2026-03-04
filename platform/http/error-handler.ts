import { json } from '@remix-run/cloudflare';

export function toErrorResponse(input: {
  requestId: string;
  status?: number;
  message: string;
  details?: Record<string, unknown>;
}) {
  return json(
    {
      ok: false,
      error: input.message,
      requestId: input.requestId,
      details: input.details,
    },
    {
      status: input.status || 500,
      headers: {
        'x-request-id': input.requestId,
      },
    },
  );
}
