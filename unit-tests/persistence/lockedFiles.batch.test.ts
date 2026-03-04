import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('~/utils/logger', () => ({
  createScopedLogger: vi.fn(() => ({ info: vi.fn(), error: vi.fn() })),
}));

import { batchLockItems, batchUnlockItems, clearCache, getLockedItemsForChat, isPathInLockedFolder } from '~/lib/persistence/lockedFiles';

function setupStorage(initial: any[] = []) {
  const data = new Map<string, string>();
  data.set('bolt.lockedFiles', JSON.stringify(initial));

  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => data.set(key, value)),
  });
}

describe('persistence/lockedFiles batch ops', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setupStorage();
    clearCache();
  });

  it('batch-locks mixed file/folder items', async () => {
    batchLockItems('chat-1', [
      { path: 'src/a.ts', isFolder: false },
      { path: 'src/dir', isFolder: true },
      { path: 'src/b.ts', isFolder: false },
    ]);

    await vi.advanceTimersByTimeAsync(350);

    const locked = getLockedItemsForChat('chat-1');
    expect(locked).toHaveLength(3);
    expect(isPathInLockedFolder('chat-1', 'src/dir/inside.ts').locked).toBe(true);
  });

  it('batch-unlocks selected paths only', async () => {
    batchLockItems('chat-2', [
      { path: 'x/a.ts', isFolder: false },
      { path: 'x/b.ts', isFolder: false },
      { path: 'x/c.ts', isFolder: false },
    ]);
    await vi.advanceTimersByTimeAsync(350);

    batchUnlockItems('chat-2', ['x/a.ts', 'x/c.ts']);
    await vi.advanceTimersByTimeAsync(350);

    const remaining = getLockedItemsForChat('chat-2').map((item) => item.path);
    expect(remaining).toEqual(['x/b.ts']);
  });

  it('no-ops for empty batch arrays', async () => {
    batchLockItems('chat-3', []);
    batchUnlockItems('chat-3', []);
    await vi.advanceTimersByTimeAsync(350);

    expect(getLockedItemsForChat('chat-3')).toEqual([]);
  });
});
