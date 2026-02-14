import type { ApiClient } from './client';

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
  content: string;
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

/**
 * 分頁回應
 */
export interface PaginatedResponse<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
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
    return this.client.get<PaginatedResponse<Comment>>(`/api/posts/${postId}/comments`, { params });
  }

  /**
   * 刪除留言
   * @param postId 貼文 ID
   * @param commentId 留言 ID
   */
  deleteComment(postId: string, commentId: string) {
    return this.client.delete<{ success: boolean }>(`/api/posts/${postId}/comments/${commentId}`);
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
    return this.client.get<PaginatedResponse<Post>>('/api/posts/search', { params });
  }
}
