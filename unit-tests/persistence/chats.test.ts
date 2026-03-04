import { describe, expect, it } from 'vitest';
import { deleteAllChats, deleteChat, getAllChats, getChatById, saveChat } from '~/lib/persistence/chats';

function createRequest<T>(result?: T, error?: Error) {
  const request: {
    result?: T;
    error?: Error;
    onsuccess: null | (() => void);
    onerror: null | (() => void);
  } = {
    result,
    error,
    onsuccess: null,
    onerror: null,
  };

  queueMicrotask(() => {
    if (error) {
      request.onerror?.();
      return;
    }

    request.onsuccess?.();
  });

  return request;
}

function createDb(options?: {
  allChats?: any[];
  chatById?: any;
  failOn?: 'getAll' | 'get' | 'put' | 'delete' | 'clear' | 'transaction';
}) {
  const store = {
    getAll: () => createRequest(options?.allChats ?? [], options?.failOn === 'getAll' ? new Error('getAll failed') : undefined),
    get: () => createRequest(options?.chatById ?? null, options?.failOn === 'get' ? new Error('get failed') : undefined),
    put: () => createRequest(undefined, options?.failOn === 'put' ? new Error('put failed') : undefined),
    delete: () => createRequest(undefined, options?.failOn === 'delete' ? new Error('delete failed') : undefined),
    clear: () => createRequest(undefined, options?.failOn === 'clear' ? new Error('clear failed') : undefined),
  };

  const db = {
    name: 'test-db',
    version: 1,
    transaction: () => {
      if (options?.failOn === 'transaction') {
        throw new Error('transaction failed');
      }

      return {
        objectStore: () => store,
      };
    },
  };

  return db as unknown as IDBDatabase;
}

describe('persistence/chats', () => {
  it('gets all chats', async () => {
    const db = createDb({ allChats: [{ id: 'c1', messages: [] }] });
    const chats = await getAllChats(db);
    expect(chats).toHaveLength(1);
    expect(chats[0].id).toBe('c1');
  });

  it('rejects when getAll transaction creation fails', async () => {
    const db = createDb({ failOn: 'transaction' });
    await expect(getAllChats(db)).rejects.toThrow('transaction failed');
  });

  it('gets a chat by id and can return null', async () => {
    const dbWithHit = createDb({ chatById: { id: 'c2', messages: [] } });
    const dbMiss = createDb({ chatById: null });

    await expect(getChatById(dbWithHit, 'c2')).resolves.toMatchObject({ id: 'c2' });
    await expect(getChatById(dbMiss, 'missing')).resolves.toBeNull();
  });

  it('saves, deletes, and clears chats', async () => {
    const db = createDb();

    await expect(saveChat(db, { id: 'c3', messages: [], timestamp: new Date().toISOString() } as any)).resolves.toBeUndefined();
    await expect(deleteChat(db, 'c3')).resolves.toBeUndefined();
    await expect(deleteAllChats(db)).resolves.toBeUndefined();
  });

  it('rejects when write operations fail', async () => {
    await expect(saveChat(createDb({ failOn: 'put' }), { id: 'x', messages: [], timestamp: 't' } as any)).rejects.toThrow('put failed');
    await expect(deleteChat(createDb({ failOn: 'delete' }), 'x')).rejects.toThrow('delete failed');
    await expect(deleteAllChats(createDb({ failOn: 'clear' }))).rejects.toThrow('clear failed');
  });
});
