import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('~/utils/logger', () => ({
  createScopedLogger: vi.fn(() => ({ info: vi.fn(), error: vi.fn() })),
}));

import { addLockedItem, clearCache, getLockedItems } from '~/lib/persistence/lockedFiles';

function setupStorage(initial: any[] = []) {
  const data = new Map<string, string>();
  data.set('bolt.lockedFiles', JSON.stringify(initial));

  const api = {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => data.set(key, value)),
  };

  vi.stubGlobal('localStorage', api);
  return api;
}

describe('persistence/lockedFiles cache behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearCache();
  });

  it('uses cache between reads until clearCache is called', async () => {
    const storage = setupStorage([{ chatId: 'c1', path: 'a.ts', isFolder: false }]);

    const first = getLockedItems();
    const second = getLockedItems();

    expect(first).toEqual(second);
    expect(storage.getItem).toHaveBeenCalledTimes(1);

    clearCache();
    getLockedItems();
    expect(storage.getItem).toHaveBeenCalledTimes(2);
  });

  it('debounces localStorage writes through save path', async () => {
    const storage = setupStorage([]);

    addLockedItem('c2', 'x.ts', false);
    addLockedItem('c2', 'y.ts', false);

    expect(storage.setItem).toHaveBeenCalledTimes(0);
    await vi.advanceTimersByTimeAsync(350);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });
});
