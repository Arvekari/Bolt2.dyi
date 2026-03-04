import { describe, expect, it } from 'vitest';
import { DEFAULT_PROVIDER } from '~/utils/constants';

describe('constants default provider', () => {
  it('exports default provider object or identifier', () => {
    expect(DEFAULT_PROVIDER).toBeDefined();
  });
});
