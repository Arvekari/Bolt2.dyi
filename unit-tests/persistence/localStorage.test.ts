import { afterEach, describe, expect, it, vi } from 'vitest';

describe('persistence/localStorage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns null when not running in client context', async () => {
    const mod = await import('~/lib/persistence/localStorage');
    expect(mod.getLocalStorage('k')).toBeNull();
  });

  it('reads and writes when localStorage is available', async () => {
    const storage = new Map<string, string>();

    vi.stubGlobal('window', {} as any);
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => storage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
    });

    const mod = await import('~/lib/persistence/localStorage');
    mod.setLocalStorage('settings', { theme: 'dark' });

    expect(storage.get('settings')).toBe(JSON.stringify({ theme: 'dark' }));
    expect(mod.getLocalStorage('settings')).toEqual({ theme: 'dark' });
  });

  it('returns null when stored JSON is invalid', async () => {
    vi.stubGlobal('window', {} as any);
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => '{invalid-json'),
      setItem: vi.fn(),
    });

    const mod = await import('~/lib/persistence/localStorage');
    expect(mod.getLocalStorage('broken')).toBeNull();
  });
});
