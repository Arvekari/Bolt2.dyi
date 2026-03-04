import { memo } from 'react';
import { describe, expect, it } from 'vitest';
import { genericMemo } from '~/utils/react';

describe('react helpers', () => {
  it('re-exports memo as genericMemo', () => {
    expect(genericMemo).toBe(memo);
  });
});
