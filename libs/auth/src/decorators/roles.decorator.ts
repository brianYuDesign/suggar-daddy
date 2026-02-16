import { SetMetadata } from '@nestjs/common';
import { PermissionRole, UserRole } from '@suggar-daddy/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: (UserRole | PermissionRole)[]) => SetMetadata(ROLES_KEY, roles);
