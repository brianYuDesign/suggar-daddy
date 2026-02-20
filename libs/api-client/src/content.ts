import type { ApiClient } from './client';
import type { CursorPaginatedResponse } from './types';

export interface Post {
  id: string;
  authorId: string;
  content: string;
  mediaUrls?: string[];
  isPremium: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostDto {
  caption: string;
  mediaUrls?: string[];
  isPremium?: boolean;
}

export interface ContentReport {
  id: string;
  reporterId: string;
  postId: string;
  reason: string;
  status: string;
  createdAt: string;
}

/**
 * 留言資料
 */
export interface Comment {
  commentId: string;
  postId: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  text: string;
  parentCommentId?: string;
  createdAt: string;
  likesCount: number;
  repliesCount: number;
}

export class ContentApi {
  constructor(private readonly client: ApiClient) {}

  /**
   * 取得貼文列表（分頁）
   */
  getPosts(cursor?: string) {
    const params = cursor ? { cursor } : undefined;
    return this.client.get<{ posts: Post[]; nextCursor?: string }>('/api/posts', { params });
  }

  /**
   * 取得單一貼文
   */
  getPost(postId: string) {
    return this.client.get<Post>(`/api/posts/${postId}`);
  }

  /**
   * 創建貼文
   */
  createPost(dto: CreatePostDto) {
    return this.client.post<Post>('/api/posts', dto);
  }

  /**
   * 刪除貼文
   */
  deletePost(postId: string) {
    return this.client.delete<void>(`/api/posts/${postId}`);
  }

  /**
   * 按讚貼文
   */
  likePost(postId: string) {
    return this.client.post<Post>(`/api/posts/${postId}/like`);
  }

  /**
   * 取消按讚
   */
  unlikePost(postId: string) {
    return this.client.delete<Post>(`/api/posts/${postId}/like`);
  }

  /**
   * 檢舉貼文
   */
  reportPost(postId: string, reason: string, description?: string) {
    return this.client.post<ContentReport>('/api/moderation/report', { postId, reason, description });
  }

  // ===== P0: 評論系統 =====

  /**
   * 新增留言
   * @param postId 貼文 ID
   * @param text 留言內容
   * @param parentCommentId 父留言 ID（用於回覆）
   */
  addComment(postId: string, text: string, parentCommentId?: string) {
    return this.client.post<Comment>(`/api/posts/${postId}/comments`, {
      text,
      parentCommentId,
    });
  }

  /**
   * 取得留言列表（分頁）
   * @param postId 貼文 ID
   * @param cursor 分頁游標
   */
  getComments(postId: string, cursor?: string) {
    const params = cursor ? { cursor } : undefined;
    return this.client.get<CursorPaginatedResponse<Comment>>(`/api/posts/${postId}/comments`, { params });
  }

  /**
   * 刪除留言
   * @param postId 貼文 ID
   * @param commentId 留言 ID
   */
  deleteComment(postId: string, commentId: string) {
    return this.client.delete<{ success: boolean }>(`/api/posts/${postId}/comments/${commentId}`);
  }

  // ===== 貼文編輯 =====

  /**
   * 更新貼文
   */
  updatePost(postId: string, dto: Partial<CreatePostDto>) {
    return this.client.put<Post>(`/api/posts/${postId}`, dto);
  }

  // ===== 書籤系統 =====

  /**
   * 收藏貼文
   */
  bookmarkPost(postId: string) {
    return this.client.post<void>(`/api/posts/${postId}/bookmark`);
  }

  /**
   * 取消收藏
   */
  unbookmarkPost(postId: string) {
    return this.client.delete<void>(`/api/posts/${postId}/bookmark`);
  }

  /**
   * 取得收藏列表
   */
  getBookmarks(cursor?: string) {
    const params = cursor ? { cursor } : undefined;
    return this.client.get<{ posts: Post[]; nextCursor?: string }>('/api/posts/bookmarks', { params });
  }

  // ===== 個人化 Feed =====

  /**
   * 取得個人化推薦 Feed
   */
  getFeed(page?: number, limit?: number) {
    const params: Record<string, number> = {};
    if (page) params['page'] = page;
    if (limit) params['limit'] = limit;
    return this.client.get<{ posts: Post[]; total: number }>('/api/posts/feed', { params });
  }

  // ===== P0: Discovery 發現 =====

  /**
   * 取得熱門貼文
   * @param limit 限制數量
   */
  getTrendingPosts(limit?: number) {
    const params = limit ? { limit } : undefined;
    return this.client.get<Post[]>('/api/posts/trending', { params });
  }

  /**
   * 搜尋貼文
   * @param query 搜尋關鍵字
   * @param cursor 分頁游標
   */
  searchPosts(query: string, cursor?: string) {
    const params: Record<string, string> = { q: query };
    if (cursor) {
      params['cursor'] = cursor;
    }
    return this.client.get<CursorPaginatedResponse<Post>>('/api/posts/search', { params });
  }
}
