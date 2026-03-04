import { describe, expect, it } from 'vitest';
import { computeFileModifications, fileModificationsToHTML } from '~/utils/diff';

describe('utils/diff edges', () => {
  it('returns undefined when modified files map has no effective changes', () => {
    const files: any = { '/a.ts': { type: 'file', content: 'same' } };
    const modified = new Map<string, string>([['/a.ts', 'same']]);

    expect(computeFileModifications(files, modified)).toBeUndefined();
  });

  it('skips non-file entries when computing modifications', () => {
    const files: any = { '/a.ts': { type: 'folder' } };
    const modified = new Map<string, string>([['/a.ts', 'old']]);

    expect(computeFileModifications(files, modified)).toBeUndefined();
  });

  it('renders multiple diff entries to html', () => {
    const html = fileModificationsToHTML({
      '/a.ts': { type: 'diff', content: '@@ -1 +1 @@\n-a\n+b' },
      '/b.ts': { type: 'file', content: 'const b = 1;' },
    } as any);

    expect(html).toContain('path="/a.ts"');
    expect(html).toContain('path="/b.ts"');
    expect(html).toContain('</bolt_file_modifications>');
  });
});
