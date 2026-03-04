import { describe, expect, it } from 'vitest';
import { PROVIDER_LIST, providerBaseUrlEnvKeys } from '~/utils/constants';

describe('constants provider env key map', () => {
  it('includes map entries for known providers', () => {
    for (const provider of PROVIDER_LIST.slice(0, 3)) {
      expect(providerBaseUrlEnvKeys).toHaveProperty(provider.name);
    }
  });
});
