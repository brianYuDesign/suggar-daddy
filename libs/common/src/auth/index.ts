// Backward compatibility: re-export everything from @suggar-daddy/auth
export {
  JwtStrategy,
  JwtAuthGuard,
  OptionalJwtGuard,
  RolesGuard,
  UserRole,
  CurrentUser,
  Public,
  IS_PUBLIC_KEY,
  Roles,
  ROLES_KEY,
} from '@suggar-daddy/auth';

export type {
  JwtPayload,
  JwtUser,
  CurrentUserData,
} from '@suggar-daddy/auth';
