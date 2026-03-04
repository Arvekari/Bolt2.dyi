import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createChatFromMessages,
  deleteById,
  deleteSnapshot,
  duplicateChat,
  forkChat,
  getAll,
  getMessages,
  getNextId,
  getSnapshot,
  getUrlId,
  openDatabase,
  setMessages,
  setSnapshot,
  updateChatDescription,
  updateChatMetadata,
} from '~/lib/persistence/db';

type ChatRecord = {
  id: string;
  urlId?: string;
  description?: string;
  messages: Array<{ id: string; role: string; content: string }>;
  timestamp: string;
  metadata?: any;
};

function asyncRequest<T>(result?: T, error?: Error) {
  const request: any = {
    result,
    error,
    onsuccess: null,
    onerror: null,
  };

  queueMicrotask(() => {
    if (error) {
      request.onerror?.({ target: request });
    } else {
      request.onsuccess?.({ target: request });
    }
  });

  return request;
}

function createMockDb(initial?: { chats?: ChatRecord[]; snapshots?: Record<string, any> }) {
  const chats = new Map<string, ChatRecord>((initial?.chats ?? []).map((chat) => [chat.id, { ...chat }]));
  const snapshots = new Map<string, any>(Object.entries(initial?.snapshots ?? {}));

  const chatsStore = {
    getAll: () => asyncRequest(Array.from(chats.values())),
    get: (id: string) => asyncRequest(chats.get(id) ?? undefined),
    put: (value: ChatRecord) => {
      chats.set(value.id, { ...value });
      return asyncRequest(undefined);
    },
    delete: (id: string) => {
      chats.delete(id);
      return asyncRequest(undefined);
    },
    getAllKeys: () => asyncRequest(Array.from(chats.keys())),
    index: () => ({
      get: (urlId: string) =>
        asyncRequest(
          Array.from(chats.values()).find((chat) => chat.urlId === urlId),
        ),
    }),
    openCursor: () => {
      const values = Array.from(chats.values());
      let index = 0;
      const request: any = { onsuccess: null, onerror: null, error: null };

      const emit = () => {
        const value = values[index];
        const cursor = value
          ? {
              value,
              continue: () => {
                index += 1;
                queueMicrotask(emit);
              },
            }
          : null;

        request.onsuccess?.({ target: { result: cursor } });
      };

      queueMicrotask(emit);
      return request;
    },
  };

  const snapshotsStore = {
    get: (chatId: string) => asyncRequest(snapshots.has(chatId) ? { snapshot: snapshots.get(chatId) } : undefined),
    put: ({ chatId, snapshot }: { chatId: string; snapshot: any }) => {
      snapshots.set(chatId, snapshot);
      return asyncRequest(undefined);
    },
    delete: (chatId: string) => {
      snapshots.delete(chatId);
      return asyncRequest(undefined);
    },
  };

  return {
    db: {
      transaction: (storeName: string | string[]) => {
        const storeNames = Array.isArray(storeName) ? storeName : [storeName];
        return {
          error: null,
          oncomplete: null,
          onerror: null,
          objectStore: (name: string) => {
            if (!storeNames.includes(name)) {
              throw new Error(`Unknown store ${name}`);
            }

            if (name === 'chats') {
              return chatsStore;
            }

            return snapshotsStore;
          },
        };
      },
    } as unknown as IDBDatabase,
    chats,
    snapshots,
  };
}

describe('persistence/db', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns undefined when indexedDB is unavailable', async () => {
    vi.stubGlobal('indexedDB', undefined);

    const db = await openDatabase();
    expect(db).toBeUndefined();
  });

  it('opens indexedDB and handles upgrade path', async () => {
    const createIndexMock = vi.fn();
    const upgradeDb = {
      objectStoreNames: { contains: vi.fn(() => false) },
      createObjectStore: vi.fn(() => ({ createIndex: createIndexMock })),
    };

    const request: any = {
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null,
      result: { name: 'boltHistory' },
    };

    vi.stubGlobal('indexedDB', {
      open: vi.fn(() => request),
    });

    const openPromise = openDatabase();

    request.onupgradeneeded?.({
      oldVersion: 0,
      target: { result: upgradeDb },
    });
    request.onsuccess?.({ target: request });

    const db = await openPromise;

    expect(db).toEqual({ name: 'boltHistory' });
    expect(upgradeDb.createObjectStore).toHaveBeenCalled();
    expect(createIndexMock).toHaveBeenCalled();
  });

  it('handles basic chat storage and retrieval operations', async () => {
    const { db, chats } = createMockDb({
      chats: [
        {
          id: '1',
          urlId: '1',
          description: 'First',
          messages: [{ id: 'm1', role: 'user', content: 'hello' }],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    const allChats = await getAll(db);
    expect(allChats).toHaveLength(1);

    await setMessages(
      db,
      '2',
      [{ id: 'm2', role: 'assistant', content: 'ok' }] as any,
      '2',
      'Second',
      '2026-01-01T00:00:00.000Z',
      { gitUrl: 'https://github.com/x/y' },
    );

    expect(chats.get('2')?.description).toBe('Second');

    await expect(setMessages(db, '3', [] as any, '3', 'Bad', 'not-a-date')).rejects.toThrow('Invalid timestamp');

    const byId = await getMessages(db, '1');
    expect(byId.id).toBe('1');

    const byUrlIdFallback = await getMessages(db, '2');
    expect(byUrlIdFallback.id).toBe('2');
  });

  it('supports id/url generation and chat clone/fork flows', async () => {
    const { db } = createMockDb({
      chats: [
        {
          id: '1',
          urlId: '1',
          description: 'Original',
          messages: [
            { id: 'm1', role: 'user', content: 'a' },
            { id: 'm2', role: 'assistant', content: 'b' },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });

    await expect(getNextId(db)).resolves.toBe('2');
    await expect(getUrlId(db, '1')).resolves.toBe('1-2');

    const duplicatedUrlId = await duplicateChat(db, '1');
    expect(duplicatedUrlId).toBeTruthy();

    const forkedUrlId = await forkChat(db, '1', 'm1');
    expect(forkedUrlId).toBeTruthy();

    await expect(forkChat(db, '1', 'missing-message')).rejects.toThrow('Message not found');
    await expect(duplicateChat(db, 'missing-chat')).rejects.toThrow('Chat not found');

    const createdUrlId = await createChatFromMessages(
      db,
      'Created from messages',
      [{ id: 'mx', role: 'user', content: 'content' }] as any,
    );
    expect(createdUrlId).toBeTruthy();
  });

  it('updates descriptions, metadata, and snapshots', async () => {
    const { db, snapshots } = createMockDb({
      chats: [
        {
          id: '10',
          urlId: '10',
          description: 'Desc',
          messages: [{ id: 'm1', role: 'user', content: 'x' }],
          timestamp: new Date().toISOString(),
          metadata: { gitUrl: 'https://github.com/a/b' },
        },
      ],
    });

    await updateChatDescription(db, '10', 'Updated');
    await updateChatMetadata(db, '10', { gitUrl: 'https://github.com/new/repo', gitBranch: 'main' });

    await expect(updateChatDescription(db, '10', '   ')).rejects.toThrow('Description cannot be empty');
    await expect(updateChatMetadata(db, '404', { gitUrl: 'x' })).rejects.toThrow('Chat not found');

    await setSnapshot(db, '10', { files: {}, chatIndex: 'm1' } as any);
    expect(snapshots.get('10')).toEqual({ files: {}, chatIndex: 'm1' });

    const snapshot = await getSnapshot(db, '10');
    expect(snapshot).toEqual({ files: {}, chatIndex: 'm1' });

    await deleteSnapshot(db, '10');
    expect(snapshots.has('10')).toBe(false);

    await deleteById(db, '10');
    await expect(getSnapshot(db, '10')).resolves.toBeUndefined();
  });
});
