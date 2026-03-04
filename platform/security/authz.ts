export type PlatformRole = 'admin' | 'user';

export function canAccessRole(role: PlatformRole | undefined, requiredRole: PlatformRole): boolean {
  if (!role) {
    return false;
  }

  if (role === 'admin') {
    return true;
  }

  return role === requiredRole;
}
