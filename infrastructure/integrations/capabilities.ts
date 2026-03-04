import { isOpenClawConfigured } from '~/lib/.server/extensions/openclaw/openclaw-client';
import { getPersistenceRuntimeStatus } from '~/lib/.server/persistence';

export function detectIntegrationCapabilities(env?: Record<string, any>) {
  const persistence = getPersistenceRuntimeStatus(env);

  return {
    persistence,
    openclaw: {
      enabled: isOpenClawConfigured(env as any),
    },
  };
}
