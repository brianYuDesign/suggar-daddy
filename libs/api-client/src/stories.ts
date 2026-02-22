import type { ApiClient } from './client';

/**
 * 限時動態資料
 */
export interface Story {
  storyId: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  mediaUrl: string;
  mediaType: 'IMAGE' | 'VIDEO';
  duration: number;
  createdAt: string;
  expiresAt: string;
  viewsCount: number;
  isViewed?: boolean;
}

/**
 * 限時動態群組（依創作者分組）
 */
export interface StoryGroup {
  userId: string;
  username: string;
  avatarUrl?: string;
  stories: Story[];
  hasUnviewed: boolean;
}

/**
 * 限時動態檢視者
 */
export interface StoryViewer {
  userId: string;
  username: string;
  avatarUrl?: string;
  viewedAt: string;
}

/**
 * 創建限時動態 DTO
 */
export interface CreateStoryDto {
  contentType: string;
  mediaUrl: string;
  caption?: string;
}

/**
 * Stories API - 限時動態系統（P1 級別）
 */
export class StoriesApi {
  constructor(private readonly client: ApiClient) {}

  /**
   * 創建限時動態
   * @param contentType 媒體類型 (IMAGE / VIDEO)
   * @param mediaUrl 媒體 URL
   * @param caption 選填文字說明
   */
  createStory(contentType: string, mediaUrl: string, caption?: string) {
    const data: CreateStoryDto = { contentType, mediaUrl };
    if (caption !== undefined) {
      data.caption = caption;
    }
    return this.client.post<Story>('/api/stories', data);
  }

  /**
   * 取得限時動態動態消息（首頁顯示）
   * 返回所有追蹤創作者的限時動態，依創作者分組
   */
  getStoriesFeed() {
    return this.client.get<StoryGroup[]>('/api/stories/feed');
  }

  /**
   * 取得指定創作者的所有限時動態
   * @param creatorId 創作者 ID
   */
  getCreatorStories(creatorId: string) {
    return this.client.get<Story[]>(`/api/stories/creator/${creatorId}`);
  }

  /**
   * 標記限時動態為已檢視
   * @param storyId 限時動態 ID
   */
  markStoryAsViewed(storyId: string) {
    return this.client.post<{ success: boolean }>(`/api/stories/${storyId}/view`);
  }

  /**
   * 取得限時動態檢視者列表（僅限創作者本人）
   * @param storyId 限時動態 ID
   */
  getStoryViewers(storyId: string) {
    return this.client.get<StoryViewer[]>(`/api/stories/${storyId}/viewers`);
  }

  /**
   * 刪除限時動態
   * @param storyId 限時動態 ID
   */
  deleteStory(storyId: string) {
    return this.client.delete<{ success: boolean }>(`/api/stories/${storyId}`);
  }

  /**
   * 取得影片串流 URL（用於 HLS/DASH 串流）
   * @param postId 貼文/影片 ID
   */
  getVideoStreamUrl(postId: string) {
    return this.client.get<{ streamUrl: string }>(`/api/videos/${postId}/stream`);
  }
}
