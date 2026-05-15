import { SetMetadata } from '@nestjs/common';

export const ADMIN_ROLES_KEY = 'admin_roles';
export type AdminRole = 'super_admin' | 'operator' | 'viewer';

export function AdminRoles(...roles: AdminRole[]) {
  return SetMetadata(ADMIN_ROLES_KEY, roles);
}
