import { describe, expect, it } from 'vitest';
import { isMobile } from '~/utils/mobile';

describe('isMobile', () => {
  it('returns true under mobile breakpoint and false above', () => {
    const original = globalThis.innerWidth;
    Object.defineProperty(globalThis, 'innerWidth', { value: 320, configurable: true });
    expect(isMobile()).toBe(true);

    Object.defineProperty(globalThis, 'innerWidth', { value: 1024, configurable: true });
    expect(isMobile()).toBe(false);

    Object.defineProperty(globalThis, 'innerWidth', { value: original, configurable: true });
  });
});
