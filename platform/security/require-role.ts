import type { PlatformRole } from '~/platform/security/authz';
import { canAccessRole } from '~/platform/security/authz';

export function hasRequiredRole(userRole: PlatformRole | undefined, requiredRole: PlatformRole) {
  return canAccessRole(userRole, requiredRole);
}
