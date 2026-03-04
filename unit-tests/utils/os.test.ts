import { describe, expect, it } from 'vitest';
import { isLinux, isMac, isWindows } from '~/utils/os';

describe('os flags', () => {
  it('exports boolean platform flags', () => {
    expect(typeof isMac).toBe('boolean');
    expect(typeof isWindows).toBe('boolean');
    expect(typeof isLinux).toBe('boolean');
  });
});
