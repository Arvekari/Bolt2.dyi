import { describe, expect, it } from 'vitest';
import { cubicEasingFn } from '~/utils/easings';

describe('easings', () => {
  it('returns numeric easing values in range', () => {
    expect(cubicEasingFn(0)).toBeGreaterThanOrEqual(0);
    expect(cubicEasingFn(1)).toBeLessThanOrEqual(1);
    const mid = cubicEasingFn(0.5);
    expect(typeof mid).toBe('number');
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });
});
