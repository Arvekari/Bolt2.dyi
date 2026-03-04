import { describe, expect, it, vi } from 'vitest';

const {
  getPersistenceRuntimeStatusMock,
  isOpenClawConfiguredMock,
} = vi.hoisted(() => ({
  getPersistenceRuntimeStatusMock: vi.fn(),
  isOpenClawConfiguredMock: vi.fn(),
}));

vi.mock('~/lib/.server/persistence', () => ({
  getPersistenceRuntimeStatus: getPersistenceRuntimeStatusMock,
}));

vi.mock('~/lib/.server/extensions/openclaw/openclaw-client', () => ({
  isOpenClawConfigured: isOpenClawConfiguredMock,
}));

import { detectIntegrationCapabilities } from '~/infrastructure/integrations/capabilities';

describe('integration capability detection', () => {
  it('reports disabled openclaw and sqlite active', () => {
    getPersistenceRuntimeStatusMock.mockReturnValue({
      configuredProvider: 'sqlite',
      activeProvider: 'sqlite',
      degraded: false,
      reason: 'sqlite configured',
    });
    isOpenClawConfiguredMock.mockReturnValue(false);

    const caps = detectIntegrationCapabilities({});

    expect(caps.openclaw.enabled).toBe(false);
    expect(caps.persistence.activeProvider).toBe('sqlite');
  });

  it('reports enabled openclaw and degraded db fallback', () => {
    getPersistenceRuntimeStatusMock.mockReturnValue({
      configuredProvider: 'postgrest',
      activeProvider: 'sqlite',
      degraded: true,
      reason: 'postgrest unreachable, fallback to sqlite',
    });
    isOpenClawConfiguredMock.mockReturnValue(true);

    const caps = detectIntegrationCapabilities({ OPENCLAW_BASE_URL: 'http://openclaw.local' });

    expect(caps.openclaw.enabled).toBe(true);
    expect(caps.persistence.degraded).toBe(true);
  });
});
