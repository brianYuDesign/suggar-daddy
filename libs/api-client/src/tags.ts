import type { ApiClient } from './client';
import type { InterestTagDto } from './matching';

export type { InterestTagDto };

export interface TagsListResponseDto {
  tags: InterestTagDto[];
  categories: string[];
}

// ==================== API Class ====================

export class TagsApi {
  constructor(private readonly client: ApiClient) {}

  /**
   * Get all available interest tags
   * @returns List of all tags grouped by category
   */
  getAllTags() {
    return this.client.get<TagsListResponseDto>('/api/users/tags');
  }

  /**
   * Get interest tags for a specific user
   * @param userId - ID of the user to get tags for
   * @returns List of the user's interest tags
   */
  getUserTags(userId: string) {
    return this.client.get<InterestTagDto[]>(`/api/users/${userId}/tags`);
  }

  /**
   * Update the current user's interest tags
   * @param tagIds - Array of tag IDs to set as the user's interests
   * @returns Updated list of the user's interest tags
   */
  updateMyTags(tagIds: string[]) {
    return this.client.put<InterestTagDto[]>('/api/users/me/tags', { tagIds });
  }
}
