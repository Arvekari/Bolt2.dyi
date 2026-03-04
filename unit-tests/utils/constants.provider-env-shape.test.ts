import { describe, expect, it } from 'vitest';
import { providerBaseUrlEnvKeys } from '~/utils/constants';

describe('constants provider env shape', () => {
  it('stores provider key objects as object values', () => {
    const entries = Object.entries(providerBaseUrlEnvKeys);
    expect(entries.length).toBeGreaterThan(0);
    expect(typeof entries[0][1]).toBe('object');
  });
});
