import { describe, expect, it } from 'vitest';
import { createCommandActionsString, createCommandsMessage, detectProjectCommands } from '~/utils/projectCommands';

describe('utils/projectCommands edges', () => {
  it('uses fallback followup when no preferred script is present', async () => {
    const files = [
      {
        path: '/workspace/package.json',
        content: JSON.stringify({ scripts: { test: 'vitest' }, dependencies: {} }),
      },
    ];

    const result = await detectProjectCommands(files as any);
    expect(result.type).toBe('Node.js');
    expect(result.startCommand).toBeUndefined();
    expect(result.followupMessage).toContain('inspect package.json');
  });

  it('returns empty command values when package.json file lookup unexpectedly fails', async () => {
    const files = [
      { path: '/workspace/other.json', content: '{}' },
      { path: '/workspace/package.json', content: '{}' },
    ];

    const result = await detectProjectCommands(files as any);
    expect(result.type).toBe('Node.js');
  });

  it('creates message with only setup command', () => {
    const message = createCommandsMessage({
      type: 'Node.js',
      setupCommand: 'npm install',
      followupMessage: '',
    });

    expect(message).not.toBeNull();
    expect(message?.content).toContain('boltArtifact');
    expect(message?.content).toContain('type="shell"');
  });

  it('creates command actions string with start-only command', () => {
    const actionString = createCommandActionsString({
      type: 'Static',
      startCommand: 'npx serve',
      followupMessage: '',
    });

    expect(actionString).toContain('type="start"');
    expect(actionString).not.toContain('type="shell"');
  });
});
