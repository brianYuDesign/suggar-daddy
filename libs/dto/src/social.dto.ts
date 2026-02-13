/**
 * Social 相關 DTO (Follow system)
 */

export interface FollowStatusDto {
  isFollowing: boolean;
}

export interface FollowerDto {
  id: string;
  displayName: string;
  avatarUrl?: string;
  role: string;
  followedAt?: string;
}

export interface FollowCountsDto {
  followerCount: number;
  followingCount: number;
}
