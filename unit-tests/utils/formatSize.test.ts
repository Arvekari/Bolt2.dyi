import { describe, expect, it } from 'vitest';
import { formatSize } from '~/utils/formatSize';

describe('formatSize', () => {
  it('formats bytes in B unit', () => {
    expect(formatSize(0)).toBe('0.0 B');
    expect(formatSize(512)).toBe('512.0 B');
  });

  it('formats KB and MB units', () => {
    expect(formatSize(1024)).toBe('1.0 KB');
    expect(formatSize(1024 * 1024)).toBe('1.0 MB');
  });

  it('formats larger units', () => {
    expect(formatSize(1024 ** 3)).toBe('1.0 GB');
    expect(formatSize(1024 ** 4)).toBe('1.0 TB');
  });
});
