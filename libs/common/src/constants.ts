/**
 * 共用常數
 */

// 重新導出角色定義
export { PermissionRole, UserRole, UserType, UserTypeValue, PermissionRoleValue } from './types/roles.types';

export const APP_NAME = 'Sugar Daddy';

/**
 * @deprecated 使用 UserType enum 替代
 */
export const USER_ROLES = {
  SUGAR_BABY: 'sugar_baby',
  SUGAR_DADDY: 'sugar_daddy',
} as const;

export const SWIPE_ACTIONS = {
  LIKE: 'like',
  PASS: 'pass',
  SUPER_LIKE: 'super_like',
} as const;

export const MATCH_STATUS = {
  ACTIVE: 'active',
  UNMATCHED: 'unmatched',
  BLOCKED: 'blocked',
} as const;
