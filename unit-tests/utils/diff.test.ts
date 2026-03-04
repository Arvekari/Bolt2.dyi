import { describe, expect, it } from 'vitest';
import {
  computeFileModifications,
  diffFiles,
  extractRelativePath,
  fileModificationsToHTML,
  modificationsRegex,
} from '~/utils/diff';

describe('utils/diff', () => {
  it('returns undefined when files are identical', () => {
    expect(diffFiles('a.ts', 'const a = 1;', 'const a = 1;')).toBeUndefined();
  });

  it('creates unified diff and strips patch header', () => {
    const diff = diffFiles('a.ts', 'const a = 1;\n', 'const a = 2;\n');

    expect(diff).toBeTruthy();
    expect(diff).not.toContain('--- a.ts');
    expect(diff).toContain('@@');
  });

  it('computes file modifications using diff/file strategy', () => {
    const files: any = {
      '/x/a.ts': { type: 'file', content: 'new-content' },
      '/x/b.ts': { type: 'file', content: 'same' },
    };
    const modified = new Map<string, string>([
      ['/x/a.ts', 'old-content'],
      ['/x/b.ts', 'same'],
      ['/x/c.ts', 'ignored'],
    ]);

    const result = computeFileModifications(files, modified);

    expect(result).toBeTruthy();
    expect(result?.['/x/a.ts']).toBeTruthy();
    expect(result?.['/x/b.ts']).toBeUndefined();
  });

  it('converts modifications to html and handles helpers', () => {
    const html = fileModificationsToHTML({
      '/x/a.ts': { type: 'diff', content: '@@ -1 +1 @@\n-a\n+b' },
    });

    expect(html).toContain('<bolt_file_modifications>');
    expect(html).toContain('<diff path="/x/a.ts">');
    expect(extractRelativePath('/home/project/src/a.ts')).toBe('src/a.ts');
    expect(modificationsRegex.test('<bolt_file_modifications>\nX\n</bolt_file_modifications>\n')).toBe(true);
    expect(fileModificationsToHTML({} as any)).toBeUndefined();
  });
});
