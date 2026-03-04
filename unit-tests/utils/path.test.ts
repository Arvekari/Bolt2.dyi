import { describe, expect, it } from 'vitest';
import { path } from '~/utils/path';

describe('path utils', () => {
  it('supports join/dirname/basename/extname', () => {
    const full = path.join('/tmp', 'demo', 'index.ts');
    expect(full).toContain('tmp');
    expect(path.dirname(full)).toContain('demo');
    expect(path.basename(full)).toBe('index.ts');
    expect(path.extname(full)).toBe('.ts');
  });

  it('supports parse and format roundtrip', () => {
    const parsed = path.parse('/home/user/file.txt');
    expect(parsed.base).toBe('file.txt');
    const formatted = path.format(parsed);
    expect(formatted).toContain('file.txt');
  });
});
