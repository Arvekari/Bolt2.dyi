import { beforeEach, describe, expect, it, vi } from 'vitest';

const { execSyncMock, existsSyncMock } = vi.hoisted(() => ({
  execSyncMock: vi.fn(),
  existsSyncMock: vi.fn(),
}));

vi.mock('child_process', () => ({
  execSync: execSyncMock,
}));

vi.mock('fs', () => ({
  existsSync: existsSyncMock,
}));

import { loader } from '~/routes/api.git-info';

describe('/api/git-info', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unknown values when .git folder does not exist', async () => {
    existsSyncMock.mockReturnValue(false);

    const response = await loader();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.branch).toBe('unknown');
    expect(data.commit).toBe('unknown');
    expect(data.isDirty).toBe(false);
  });

  it('returns branch, commit, dirty status and last commit details', async () => {
    existsSyncMock.mockReturnValue(true);
    execSyncMock.mockImplementation((command: string) => {
      if (command.includes('abbrev-ref')) {
        return 'main\n';
      }

      if (command === 'git rev-parse HEAD') {
        return 'abc123\n';
      }

      if (command.includes('status --porcelain')) {
        return ' M file.ts\n';
      }

      if (command.includes('remote get-url origin')) {
        return 'https://github.com/org/repo.git\n';
      }

      if (command.includes('git log -1')) {
        return 'feat: test commit|2026-03-03 10:00:00 +0000|arva\n';
      }

      return '';
    });

    const response = await loader();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.branch).toBe('main');
    expect(data.commit).toBe('abc123');
    expect(data.isDirty).toBe(true);
    expect(data.remoteUrl).toBe('https://github.com/org/repo.git');
    expect(data.lastCommit).toMatchObject({ message: 'feat: test commit', author: 'arva' });
  });

  it('returns 500 when git command throws unexpectedly', async () => {
    existsSyncMock.mockReturnValue(true);
    execSyncMock.mockImplementation(() => {
      throw new Error('git failure');
    });

    const response = await loader();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.branch).toBe('error');
    expect(data.error).toContain('git failure');
  });
});
