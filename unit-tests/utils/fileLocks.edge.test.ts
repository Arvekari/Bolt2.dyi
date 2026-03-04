import { describe, expect, it, vi } from 'vitest';

const { loggerErrorMock } = vi.hoisted(() => ({
  loggerErrorMock: vi.fn(),
}));

vi.mock('~/lib/persistence/lockedFiles', () => ({
  getLockedItems: vi.fn(() => []),
  isFileLocked: vi.fn(() => ({ locked: false })),
  isFolderLocked: vi.fn(() => ({ locked: false })),
  isPathInLockedFolder: vi.fn(() => ({ locked: false })),
}));

vi.mock('~/utils/logger', () => ({
  createScopedLogger: vi.fn(() => ({
    error: loggerErrorMock,
  })),
}));

import { getCurrentChatId, hasLockedItems } from '~/utils/fileLocks';

describe('utils/fileLocks edges', () => {
  it('returns default chat id when window is undefined', () => {
    vi.stubGlobal('window', undefined as any);
    expect(getCurrentChatId()).toBe('default');
  });

  it('returns default and logs when pathname access throws', () => {
    const windowMock: any = {};
    Object.defineProperty(windowMock, 'location', {
      get() {
        throw new Error('location blocked');
      },
    });
    vi.stubGlobal('window', windowMock);

    expect(getCurrentChatId()).toBe('default');
    expect(loggerErrorMock).toHaveBeenCalled();
  });

  it('returns false for hasLockedItems when lock source fails', async () => {
    const mod = await import('~/lib/persistence/lockedFiles');
    (mod.getLockedItems as any).mockImplementationOnce(() => {
      throw new Error('read fail');
    });

    expect(hasLockedItems('chat')).toBe(false);
  });
});
