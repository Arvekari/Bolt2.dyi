import { describe, expect, it } from 'vitest';

import { canAccessRole } from '~/platform/security/authz';

describe('authz', () => {
  it('allows admin to access admin and user routes', () => {
    expect(canAccessRole('admin', 'admin')).toBe(true);
    expect(canAccessRole('admin', 'user')).toBe(true);
  });

  it('allows user role to access only user routes', () => {
    expect(canAccessRole('user', 'user')).toBe(true);
    expect(canAccessRole('user', 'admin')).toBe(false);
  });

  it('denies unknown role', () => {
    expect(canAccessRole(undefined, 'user')).toBe(false);
  });
});
