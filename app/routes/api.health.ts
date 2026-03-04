import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { getRequestId } from '~/platform/http/request-context';
import { isPersistenceEnabled } from '~/lib/.server/persistence';
import { detectIntegrationCapabilities } from '~/infrastructure/integrations/capabilities';

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const requestId = getRequestId(request);
  const env = context.cloudflare?.env as Record<string, any> | undefined;
  const capabilities = detectIntegrationCapabilities(env);

  return json(
    {
      status: 'healthy',
      requestId,
      timestamp: new Date().toISOString(),
      checks: {
        persistence: isPersistenceEnabled(env) ? 'enabled' : 'disabled',
        dbProvider: capabilities.persistence.activeProvider,
        fallback: capabilities.persistence.degraded ? 'degraded' : 'none',
        openclaw: capabilities.openclaw.enabled ? 'enabled' : 'disabled',
      },
    },
    {
      headers: {
        'x-request-id': requestId,
      },
    },
  );
};
