import { describe, expect, it } from 'vitest';
import { getNextId, getUrlId } from '~/lib/persistence/db';

function mockDbWithKeys(keys: string[]) {
  return {
    transaction: () => ({
      objectStore: () => ({
        getAllKeys: () => {
          const req: any = { result: keys, onsuccess: null, onerror: null };
          queueMicrotask(() => req.onsuccess?.());
          return req;
        },
        openCursor: () => {
          let index = 0;
          const request: any = { onsuccess: null, onerror: null };
          const emit = () => {
            if (index < keys.length) {
              const cursor = {
                value: { urlId: keys[index] },
                continue: () => {
                  index += 1;
                  queueMicrotask(emit);
                },
              };
              request.onsuccess?.({ target: { result: cursor } });
            } else {
              request.onsuccess?.({ target: { result: null } });
            }
          };
          queueMicrotask(emit);
          return request;
        },
      }),
    }),
  } as any;
}

describe('persistence/db ids', () => {
  it('computes next numeric id', async () => {
    await expect(getNextId(mockDbWithKeys(['1', '7', '3']))).resolves.toBe('8');
  });

  it('returns unique url id when collision exists', async () => {
    const db = mockDbWithKeys(['proj', 'proj-2', 'other']);
    await expect(getUrlId(db, 'proj')).resolves.toBe('proj-3');
    await expect(getUrlId(db, 'fresh')).resolves.toBe('fresh');
  });
});
