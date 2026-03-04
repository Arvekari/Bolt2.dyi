import { describe, expect, it, vi } from 'vitest';
import { detectProjectType, isBinaryFile } from '~/utils/fileUtils';

function createMockFile(content: Uint8Array, webkitRelativePath: string) {
  return {
    webkitRelativePath,
    slice: () => ({
      arrayBuffer: async () => content.buffer,
    }),
  } as any;
}

describe('utils/fileUtils edges', () => {
  it('detects binary files by null byte and control chars', async () => {
    const binaryFile = createMockFile(new Uint8Array([0, 10, 13]), 'bin.dat');
    const textFile = createMockFile(new Uint8Array([65, 66, 67, 10]), 'a.txt');

    await expect(isBinaryFile(binaryFile)).resolves.toBe(true);
    await expect(isBinaryFile(textFile)).resolves.toBe(false);
  });

  it('returns empty project type when no recognized files exist', async () => {
    const result = await detectProjectType([{ webkitRelativePath: 'README.md' }] as any);
    expect(result.type).toBe('');
    expect(result.setupCommand).toBe('');
  });

  it('handles package.json parse errors gracefully', async () => {
    class BrokenReader {
      result: string | null = '{invalid-json';
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      readAsText() {
        this.onload?.();
      }
    }

    vi.stubGlobal('FileReader', BrokenReader as any);

    const result = await detectProjectType([{ webkitRelativePath: 'package.json' }] as any);
    expect(result.type).toBe('Node.js');
    expect(result.setupCommand).toContain('npm install');
  });
});
