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
    expect(result.startCommand).toContain('node -e');
    expect(result.startCommand).toContain('Preview server listening');
  });

  it('detects nested static projects and starts server in the entry directory', async () => {
    const files = [{ path: '/workspace/public/index.html', content: '<html></html>' }];
    const result = await detectProjectCommands(files as any);

    expect(result.type).toBe('Static');
    expect(result.startCommand).toContain('cd public &&');
  });

  it('detects php projects and uses php preview fallback server', async () => {
    const files = [{ path: '/workspace/index.php', content: '<?php echo "hi"; ?><html><body>Hello</body></html>' }];
    const result = await detectProjectCommands(files as any);

    expect(result.type).toBe('PHP');
    expect(result.startCommand).toContain('node -e');
    expect(result.startCommand).toContain('php-static-fallback');
    expect(result.followupMessage).toContain('PHP-style project');
  });

  it('detects nested pnpm project and prefixes directory for commands', async () => {
    const files = [
      {
        path: '/workspace/frontend/package.json',
        content: JSON.stringify({
          scripts: { dev: 'vite' },
          dependencies: { react: '^18.0.0' },
        }),
      },
      {
        path: '/workspace/frontend/pnpm-lock.yaml',
        content: 'lockfileVersion: 9.0',
      },
    ];

    const result = await detectProjectCommands(files as any);
    expect(result.type).toBe('Node.js');
    expect(result.startCommand).toBe('cd frontend && pnpm run dev');
    expect(result.setupCommand).toContain('cd frontend');
    expect(result.setupCommand).toContain('pnpm install --frozen-lockfile=false');
  });

  it('detects FastAPI project from main.py', async () => {
    const files = [
      { path: '/workspace/requirements.txt', content: 'fastapi\nuvicorn\n' },
      { path: '/workspace/main.py', content: 'from fastapi import FastAPI\napp = FastAPI()\n' },
    ];

    const result = await detectProjectCommands(files as any);
    expect(result.type).toBe('Python');
    expect(result.setupCommand).toBe('python -m pip install -r requirements.txt');
    expect(result.startCommand).toBe('uvicorn main:app --host 0.0.0.0 --port 8000');
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
