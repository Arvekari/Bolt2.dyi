import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { getRequestId } from '~/platform/http/request-context';

const processUptime = (globalThis as any)?.process?.uptime;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const requestId = getRequestId(request);

  return json(
    {
      ok: true,
      requestId,
      metrics: {
        uptimeSeconds: typeof processUptime === 'function' ? Number(processUptime()) : 0,
        timestamp: new Date().toISOString(),
      },
    },
    {
      headers: {
        'x-request-id': requestId,
      },
    },
  );
};
