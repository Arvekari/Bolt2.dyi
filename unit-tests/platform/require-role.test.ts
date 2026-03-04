import { describe, expect, it } from 'vitest';

import { hasRequiredRole } from '~/platform/security/require-role';

describe('require-role', () => {
  it('allows admin for admin and user requirement', () => {
    expect(hasRequiredRole('admin', 'admin')).toBe(true);
    expect(hasRequiredRole('admin', 'user')).toBe(true);
  });

  it('blocks user for admin requirement', () => {
    expect(hasRequiredRole('user', 'admin')).toBe(false);
  });
});
