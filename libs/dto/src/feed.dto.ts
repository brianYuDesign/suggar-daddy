/**
 * Feed / Discovery 相關 DTO
 */

import type { UserType, PermissionRole } from '@suggar-daddy/common';

export interface FeedPostDto {
  id: string;
  creatorId: string;
  contentType: string;
  caption: string | null;
  mediaUrls: string[];
  visibility: string;
  likeCount: number;
  commentCount: number;
  bookmarkCount?: number;
  createdAt: string;
  locked?: boolean;
}

export interface TrendingPostDto {
  id: string;
  creatorId: string;
  contentType: string;
  caption: string | null;
  mediaUrls: string[];
  likeCount: number;
  commentCount: number;
  bookmarkCount: number;
  engagementScore: number;
  createdAt: string;
}

export interface RecommendedCreatorDto {
  id: string;
  username?: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  followerCount: number;
  userType: UserType;
  permissionRole: PermissionRole;
}
