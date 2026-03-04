import { describe, it, expect } from 'vitest';
import { classNames } from '~/utils/classNames';

describe('classNames', () => {
  it('joins string arguments', () => {
    expect(classNames('a', 'b', 'c')).toBe('a b c');
  });

  it('handles object conditions', () => {
    expect(classNames({ a: true, b: false, c: true })).toBe('a c');
  });

  it('handles nested arrays and mixed values', () => {
    expect(classNames('base', ['x', { y: true, z: false }], 10, null, undefined, false)).toBe('base x y 10');
  });

  it('returns empty string for falsy-only input', () => {
    expect(classNames(false, null, undefined, '')).toBe('');
  });
}
);
