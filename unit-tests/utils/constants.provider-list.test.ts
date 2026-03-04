import { describe, expect, it } from 'vitest';
import { PROVIDER_LIST } from '~/utils/constants';

describe('constants provider list', () => {
  it('contains at least one provider', () => {
    expect(Array.isArray(PROVIDER_LIST)).toBe(true);
    expect(PROVIDER_LIST.length).toBeGreaterThan(0);
  });
});
