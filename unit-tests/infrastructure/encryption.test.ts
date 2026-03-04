import { describe, expect, it } from 'vitest';

import { decryptSecret, encryptSecret } from '~/infrastructure/encryption/secret-box';

describe('secret-box', () => {
  it('encrypts and decrypts value with same key', async () => {
    const key = '0123456789abcdef0123456789abcdef';
    const encrypted = await encryptSecret('hello-world', key);
    const decrypted = await decryptSecret(encrypted, key);

    expect(encrypted).not.toBe('hello-world');
    expect(decrypted).toBe('hello-world');
  });

  it('returns null when decrypting with wrong key', async () => {
    const encrypted = await encryptSecret('hello-world', '0123456789abcdef0123456789abcdef');
    const decrypted = await decryptSecret(encrypted, 'fedcba9876543210fedcba9876543210');

    expect(decrypted).toBeNull();
  });
});
