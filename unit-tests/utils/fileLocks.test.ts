import { describe, expect, it, vi } from 'vitest';

const {
  getLockedItemsMock,
  isFileLockedInternalMock,
  isFolderLockedInternalMock,
  isPathInLockedFolderMock,
  loggerErrorMock,
} = vi.hoisted(() => ({
  getLockedItemsMock: vi.fn(),
  isFileLockedInternalMock: vi.fn(),
  isFolderLockedInternalMock: vi.fn(),
  isPathInLockedFolderMock: vi.fn(),
  loggerErrorMock: vi.fn(),
}));

vi.mock('~/lib/persistence/lockedFiles', () => ({
  getLockedItems: getLockedItemsMock,
  isFileLocked: isFileLockedInternalMock,
  isFolderLocked: isFolderLockedInternalMock,
  isPathInLockedFolder: isPathInLockedFolderMock,
}));

vi.mock('~/utils/logger', () => ({
  createScopedLogger: vi.fn(() => ({
    error: loggerErrorMock,
  })),
}));

import { getCurrentChatId, hasLockedItems, isFileLocked, isFolderLocked } from '~/utils/fileLocks';

describe('utils/fileLocks', () => {
  it('extracts chat id from location pathname', () => {
    vi.stubGlobal('window', { location: { pathname: '/chat/abc-123' } });
    expect(getCurrentChatId()).toBe('abc-123');
  });

  it('returns default chat id when no chat path exists', () => {
    vi.stubGlobal('window', { location: { pathname: '/settings' } });
    expect(getCurrentChatId()).toBe('default');
  });

  it('returns explicit file lock result from internal checker', () => {
    isFileLockedInternalMock.mockReturnValue({ locked: true, lockedBy: 'alice' });

    const result = isFileLocked('/src/app.ts', 'chat-1');
    expect(result).toEqual({ locked: true, lockedBy: 'alice' });
    expect(isFileLockedInternalMock).toHaveBeenCalledWith('chat-1', '/src/app.ts');
  });

  it('falls back to locked-folder lookup when file lock is false', () => {
    isFileLockedInternalMock.mockReturnValue({ locked: false });
    isPathInLockedFolderMock.mockReturnValue({ locked: true, lockedBy: 'bob' });

    const result = isFileLocked('/src/a/b.ts', 'chat-2');
    expect(result).toEqual({ locked: true, lockedBy: 'bob' });
  });

  it('returns unlocked state when file lock check throws', () => {
    isFileLockedInternalMock.mockImplementation(() => {
      throw new Error('boom');
    });

    const result = isFileLocked('/src/err.ts', 'chat-3');
    expect(result).toEqual({ locked: false });
    expect(loggerErrorMock).toHaveBeenCalled();
  });

  it('checks folder lock status and handles errors', () => {
    isFolderLockedInternalMock.mockReturnValueOnce({ locked: true, lockedBy: 'carol' });
    expect(isFolderLocked('/src', 'chat-9')).toEqual({ locked: true, lockedBy: 'carol' });

    isFolderLockedInternalMock.mockImplementationOnce(() => {
      throw new Error('folder fail');
    });
    expect(isFolderLocked('/src', 'chat-9')).toEqual({ locked: false });
  });

  it('detects whether chat has locked items', () => {
    getLockedItemsMock.mockReturnValue([
      { chatId: 'chat-1', path: '/a' },
      { chatId: 'chat-2', path: '/b' },
    ]);

    expect(hasLockedItems('chat-2')).toBe(true);
    expect(hasLockedItems('chat-missing')).toBe(false);
  });

  it('returns false when locked item fetch throws', () => {
    getLockedItemsMock.mockImplementation(() => {
      throw new Error('storage fail');
    });

    expect(hasLockedItems('chat-1')).toBe(false);
    expect(loggerErrorMock).toHaveBeenCalled();
  });
});
