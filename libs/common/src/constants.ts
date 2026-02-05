/**
 * 共用常數
 */

export const APP_NAME = 'Sugar Daddy';

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
