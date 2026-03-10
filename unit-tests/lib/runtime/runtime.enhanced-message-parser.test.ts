import { describe, expect, it, vi } from 'vitest';

describe('runtime/enhanced-message-parser module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/runtime/enhanced-message-parser');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });

  it('auto-wraps build/file response into file action callbacks', async () => {
    const { EnhancedStreamingMessageParser } = await import('~/lib/runtime/enhanced-message-parser');

    const onActionClose = vi.fn();
    const onArtifactOpen = vi.fn();

    const parser = new EnhancedStreamingMessageParser({
      callbacks: {
        onArtifactOpen,
        onActionClose,
      },
    });

    const input = `Create src/main.ts:\n\n\`\`\`ts
export function hello() {
  return 'ok';
}
\`\`\``;

    const output = parser.parse('msg-build-1', input);

    expect(output).toContain('__boltArtifact__');
    expect(onArtifactOpen).toHaveBeenCalledTimes(1);
    expect(onActionClose).toHaveBeenCalledTimes(1);

    const actionArg = onActionClose.mock.calls[0][0];
    expect(actionArg.action.type).toBe('file');
    expect(actionArg.action.filePath).toBe('/src/main.ts');
    expect(actionArg.action.content).toContain("return 'ok';");
  });

  it('auto-wraps runnable shell commands as shell action', async () => {
    const { EnhancedStreamingMessageParser } = await import('~/lib/runtime/enhanced-message-parser');

    const onActionClose = vi.fn();
    const parser = new EnhancedStreamingMessageParser({
      callbacks: {
        onActionClose,
      },
    });

    const input = `Run these commands:\n\n\`\`\`bash
npm install
npm run dev
\`\`\``;

    const output = parser.parse('msg-build-2', input);

    expect(output).toContain('__boltArtifact__');
    expect(onActionClose).toHaveBeenCalledTimes(1);

    const actionArg = onActionClose.mock.calls[0][0];
    expect(actionArg.action.type).toBe('shell');
    expect(actionArg.action.content).toContain('npm install');
    expect(actionArg.action.content).toContain('npm run dev');
  });
});