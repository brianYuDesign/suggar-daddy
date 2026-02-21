/**
 * Social 相關 DTO (Follow system)
 */

import type { UserType, PermissionRole } from '@suggar-daddy/common';

export interface FollowStatusDto {
  isFollowing: boolean;
}

export interface FollowerDto {
  id: string;
  username?: string;
  displayName: string;
  avatarUrl?: string;
  userType: UserType;
  permissionRole: PermissionRole;
  followedAt?: string;
}

export interface FollowCountsDto {
  followerCount: number;
  followingCount: number;
}
