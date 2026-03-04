import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('~/utils/logger', () => ({
  createScopedLogger: vi.fn(() => ({ info: vi.fn(), error: vi.fn() })),
}));

import {
  addLockedFile,
  addLockedFolder,
  clearCache,
  getLockedFilesForChat,
  getLockedFoldersForChat,
  getLockedItems,
  isFileLocked,
  isFolderLocked,
  removeLockedFile,
  removeLockedFolder,
} from '~/lib/persistence/lockedFiles';

function setupStorage(initial: any[] = []) {
  const data = new Map<string, string>();
  data.set('bolt.lockedFiles', JSON.stringify(initial));

  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => data.set(key, value)),
  });
}

describe('persistence/lockedFiles core', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setupStorage();
    clearCache();
  });

  it('adds and removes file/folder locks', async () => {
    addLockedFile('chat-1', 'src/a.ts');
    addLockedFolder('chat-1', 'src/locked');

    await vi.advanceTimersByTimeAsync(350);

    expect(getLockedItems()).toHaveLength(2);

    removeLockedFile('chat-1', 'src/a.ts');
    removeLockedFolder('chat-1', 'src/locked');

    await vi.advanceTimersByTimeAsync(350);

    expect(getLockedItems()).toHaveLength(0);
  });

  it('detects direct and parent-folder locks', async () => {
    addLockedFolder('chat-2', 'src/secure');
    addLockedFile('chat-2', 'src/main.ts');

    await vi.advanceTimersByTimeAsync(350);

    expect(isFileLocked('chat-2', 'src/main.ts').locked).toBe(true);
    expect(isFileLocked('chat-2', 'src/secure/file.ts').lockedBy).toBe('src/secure');
    expect(isFolderLocked('chat-2', 'src/secure').locked).toBe(true);
  });

  it('returns chat-specific locked files and folders', async () => {
    addLockedFile('chat-a', 'a.ts');
    addLockedFolder('chat-a', 'folderA');
    addLockedFile('chat-b', 'b.ts');

    await vi.advanceTimersByTimeAsync(350);

    expect(getLockedFilesForChat('chat-a').map((item) => item.path)).toEqual(['a.ts']);
    expect(getLockedFoldersForChat('chat-a').map((item) => item.path)).toEqual(['folderA']);
  });
});
