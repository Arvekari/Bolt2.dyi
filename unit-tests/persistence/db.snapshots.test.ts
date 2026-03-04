import { describe, expect, it } from 'vitest';
import { deleteSnapshot, getSnapshot, setSnapshot } from '~/lib/persistence/db';

function snapshotDb(opts?: { failDeleteNotFound?: boolean }) {
  const snapshots = new Map<string, any>();

  return {
    db: {
      transaction: () => ({
        objectStore: () => ({
          get: (chatId: string) => {
            const req: any = { result: snapshots.has(chatId) ? { snapshot: snapshots.get(chatId) } : undefined, onsuccess: null, onerror: null };
            queueMicrotask(() => req.onsuccess?.());
            return req;
          },
          put: ({ chatId, snapshot }: any) => {
            snapshots.set(chatId, snapshot);
            const req: any = { onsuccess: null, onerror: null };
            queueMicrotask(() => req.onsuccess?.());
            return req;
          },
          delete: (chatId: string) => {
            const req: any = { onsuccess: null, onerror: null, error: null };
            queueMicrotask(() => {
              if (opts?.failDeleteNotFound) {
                req.error = { name: 'NotFoundError' };
                req.onerror?.({ target: req });
                return;
              }
              snapshots.delete(chatId);
              req.onsuccess?.();
            });
            return req;
          },
        }),
      }),
    } as any,
    snapshots,
  };
}

describe('persistence/db snapshots', () => {
  it('sets and gets snapshot data', async () => {
    const ctx = snapshotDb();
    await setSnapshot(ctx.db, 'c1', { files: {}, chatIndex: 'm1' } as any);
    await expect(getSnapshot(ctx.db, 'c1')).resolves.toEqual({ files: {}, chatIndex: 'm1' });
  });

  it('handles deleteSnapshot NotFoundError as success', async () => {
    const ctx = snapshotDb({ failDeleteNotFound: true });
    await expect(deleteSnapshot(ctx.db, 'missing')).resolves.toBeUndefined();
  });
});
