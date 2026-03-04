import { describe, expect, it, vi } from 'vitest';
import { detectProjectType, filesToArtifacts, generateId, shouldIncludeFile } from '~/utils/fileUtils';

describe('utils/fileUtils', () => {
  it('generates non-empty id', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('filters ignored file patterns', () => {
    expect(shouldIncludeFile('src/main.ts')).toBe(true);
    expect(shouldIncludeFile('node_modules/pkg/index.js')).toBe(false);
    expect(shouldIncludeFile('coverage/index.html')).toBe(false);
  });

  it('renders files to bolt artifact markup', () => {
    const artifact = filesToArtifacts(
      {
        'src/a.ts': { content: 'export const a = 1;' },
        'src/b.ts': { content: 'export const b = 2;' },
      },
      'artifact-1',
    );

    expect(artifact).toContain('<boltArtifact id="artifact-1"');
    expect(artifact).toContain('filePath="src/a.ts"');
    expect(artifact).toContain('filePath="src/b.ts"');
  });

  it('detects static project when index.html is present', async () => {
    const files = [{ webkitRelativePath: 'index.html' }] as any;
    const result = await detectProjectType(files);

    expect(result.type).toBe('Static');
    expect(result.setupCommand).toContain('serve');
  });

  it('detects node project and script command from package.json', async () => {
    const files = [
      {
        webkitRelativePath: 'package.json',
      },
    ] as any;

    class FileReaderMock {
      result: string | null = JSON.stringify({ scripts: { dev: 'vite' } });
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      readAsText() {
        this.onload?.();
      }
    }

    vi.stubGlobal('FileReader', FileReaderMock as any);

    const result = await detectProjectType(files);
    expect(result.type).toBe('Node.js');
    expect(result.setupCommand).toContain('npm run dev');
  });
});
