import { describe, expect, it } from 'vitest';
import { withResolvers } from '~/utils/promises';

describe('utils/promises', () => {
  it('returns resolve/reject/promise triple and resolves value', async () => {
    const resolvers = withResolvers<number>();
    resolvers.resolve(42);

    await expect(resolvers.promise).resolves.toBe(42);
  });

  it('supports rejection through returned reject function', async () => {
    const resolvers = withResolvers<number>();
    resolvers.reject(new Error('reject-test'));

    await expect(resolvers.promise).rejects.toThrow('reject-test');
  });
});
