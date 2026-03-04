import { describe, expect, it } from 'vitest';

import { buildSetupDbConfig } from '~/components/auth/AuthGate';

describe('AuthGate setup db config helper', () => {
  it('uses sqlite when sqlite selected', () => {
    expect(buildSetupDbConfig({ provider: 'sqlite', postgresUrl: 'postgresql://x' })).toEqual({
      provider: 'sqlite',
      postgresUrl: '',
    });
  });

  it('uses postgres when selected and url provided', () => {
    expect(buildSetupDbConfig({ provider: 'postgres', postgresUrl: '  postgresql://user:pass@host/db  ' })).toEqual({
      provider: 'postgres',
      postgresUrl: 'postgresql://user:pass@host/db',
    });
  });

  it('falls back to sqlite when postgres selected but url missing', () => {
    expect(buildSetupDbConfig({ provider: 'postgres', postgresUrl: '   ' })).toEqual({
      provider: 'sqlite',
      postgresUrl: '',
    });
  });
});
