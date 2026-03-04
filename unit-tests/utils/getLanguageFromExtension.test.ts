import { describe, it, expect } from 'vitest';
import { getLanguageFromExtension } from '~/utils/getLanguageFromExtension';

describe('getLanguageFromExtension', () => {
  it('maps known extensions', () => {
    expect(getLanguageFromExtension('ts')).toBe('typescript');
    expect(getLanguageFromExtension('php')).toBe('php');
    expect(getLanguageFromExtension('py')).toBe('python');
  });

  it('falls back to typescript for unknown extension', () => {
    expect(getLanguageFromExtension('unknown')).toBe('typescript');
  });
});
