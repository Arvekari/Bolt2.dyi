import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('~/utils/logger', () => ({
  createScopedLogger: vi.fn(() => ({ info: vi.fn(), error: vi.fn() })),
}));

import { clearCache, getLockedItems, migrateLegacyLocks } from '~/lib/persistence/lockedFiles';

function setupStorage(raw: any) {
  const data = new Map<string, string>();
  data.set('bolt.lockedFiles', JSON.stringify(raw));

  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => data.set(key, value)),
  });
}

describe('persistence/lockedFiles migration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('migrates legacy lock entries missing chatId/isFolder', async () => {
    setupStorage([{ path: 'src/a.ts' }, { chatId: 'x', path: 'src/b.ts', isFolder: false }]);
    clearCache();

    migrateLegacyLocks('chat-current');
    await vi.advanceTimersByTimeAsync(350);

    const items = getLockedItems();
    expect(items.some((item) => item.chatId === 'chat-current' && item.path === 'src/a.ts')).toBe(true);
    expect(items.every((item) => typeof item.isFolder === 'boolean')).toBe(true);
  });

  it('keeps already-migrated entries unchanged', async () => {
    setupStorage([{ chatId: 'chat-1', path: 'x.ts', isFolder: true }]);
    clearCache();

    migrateLegacyLocks('chat-z');
    await vi.advanceTimersByTimeAsync(350);

    const items = getLockedItems();
    expect(items).toEqual([{ chatId: 'chat-1', path: 'x.ts', isFolder: true }]);
  });
});
