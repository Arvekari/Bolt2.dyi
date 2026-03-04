import { describe, expect, it, vi } from 'vitest';
import {
  createCommandActionsString,
  createCommandsMessage,
  detectProjectCommands,
  escapeBoltAActionTags,
  escapeBoltArtifactTags,
  escapeBoltTags,
} from '~/utils/projectCommands';

vi.mock('~/utils/fileUtils', () => ({
  generateId: vi.fn(() => 'generated-id'),
}));

describe('utils/projectCommands', () => {
  it('detects node project and selects preferred dev command', async () => {
    const files = [
      {
        path: '/workspace/package.json',
        content: JSON.stringify({
          scripts: { dev: 'vite', start: 'node server.js' },
          dependencies: { react: '^18.0.0' },
        }),
      },
    ];

    const result = await detectProjectCommands(files as any);

    expect(result.type).toBe('Node.js');
    expect(result.startCommand).toBe('npm run dev');
    expect(result.setupCommand).toContain('npm install --yes --no-audit --no-fund --silent');
  });

  it('detects shadcn projects and appends init command', async () => {
    const files = [
      {
        path: '/workspace/package.json',
        content: JSON.stringify({
          scripts: { preview: 'vite preview' },
          dependencies: { react: '^18.0.0', 'shadcn-ui': '^0.1.0' },
        }),
      },
      {
        path: '/workspace/components.json',
        content: '{"style":"new-york","$schema":"shadcn"}',
      },
    ];

    const result = await detectProjectCommands(files as any);
    expect(result.setupCommand).toContain('npx --yes shadcn@latest init');
    expect(result.startCommand).toBe('npm run preview');
  });

  it('handles invalid package.json by returning empty command set', async () => {
    const files = [{ path: '/workspace/package.json', content: '{invalid-json' }];

    const result = await detectProjectCommands(files as any);
    expect(result.type).toBe('');
    expect(result.setupCommand).toBe('');
  });

  it('detects static projects via index.html', async () => {
    const files = [{ path: '/workspace/index.html', content: '<html></html>' }];
    const result = await detectProjectCommands(files as any);

    expect(result.type).toBe('Static');
    expect(result.startCommand).toContain('serve');
  });

  it('creates assistant command message when commands exist', () => {
    const message = createCommandsMessage({
      type: 'Node.js',
      setupCommand: 'npm install',
      startCommand: 'npm run dev',
      followupMessage: 'Running dev command',
    });

    expect(message).not.toBeNull();
    expect(message?.id).toBe('generated-id');
    expect(message?.content).toContain('<boltAction type="shell">npm install</boltAction>');
    expect(message?.content).toContain('<boltAction type="start">npm run dev</boltAction>');
  });

  it('returns null command message when no commands are present', () => {
    const message = createCommandsMessage({ type: 'Node.js', followupMessage: '' });
    expect(message).toBeNull();
  });

  it('escapes bolt tags correctly', () => {
    const artifact = '<boltArtifact id="a">X</boltArtifact>';
    const action = '<boltAction type="shell">npm run dev</boltAction>';

    expect(escapeBoltArtifactTags(artifact)).toContain('&lt;boltArtifact');
    expect(escapeBoltAActionTags(action)).toContain('&lt;boltAction');
    expect(escapeBoltTags(`${artifact}${action}`)).toContain('&lt;boltArtifact');
    expect(escapeBoltTags(`${artifact}${action}`)).toContain('&lt;boltAction');
  });

  it('builds command action string from setup and start commands', () => {
    const commands = createCommandActionsString({
      type: 'Node.js',
      setupCommand: 'npm install',
      startCommand: 'npm run dev',
      followupMessage: '',
    });

    expect(commands).toContain('<boltAction type="shell">npm install</boltAction>');
    expect(commands).toContain('<boltAction type="start">npm run dev</boltAction>');
    expect(createCommandActionsString({ type: 'Node.js', followupMessage: '' })).toBe('');
  });
});
