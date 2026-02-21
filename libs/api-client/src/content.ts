import type { ApiClient } from './client';
import type { CursorPaginatedResponse } from './types';

export interface Post {
  id: string;
  authorId: string;
  content: string;
  mediaUrls?: string[];
  isPremium: boolean;
  likeCount: number;
  tipCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostDto {
  content: string;
  mediaUrls?: string[];
  isPremium?: boolean;
}

interface BackendCreatePostDto {
  creatorId: string;
  contentType: string;
  caption: string;
  mediaUrls: string[];
  visibility: string;
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
  async getPosts(cursor?: string) {
    const page = cursor ? parseInt(cursor, 10) : 1;
    const params: Record<string, string> = { page: String(page), limit: '20' };
    const raw = await this.client.get<{
      data: Array<{
        id: string;
        creatorId: string;
        caption: string;
        mediaUrls?: string[];
        visibility: string;
        likeCount?: number;
        tipCount?: number;
        createdAt: string;
        updatedAt: string;
      }>;
      total: number;
      page: number;
      limit: number;
    }>('/api/posts', { params });

    const posts: Post[] = raw.data.map((p) => ({
      id: p.id,
      authorId: p.creatorId,
      content: p.caption || '',
      mediaUrls: p.mediaUrls,
      isPremium: p.visibility !== 'public',
      likeCount: p.likeCount ?? 0,
      tipCount: p.tipCount ?? 0,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    const hasMore = raw.page * raw.limit < raw.total;
    return { posts, nextCursor: hasMore ? String(raw.page + 1) : undefined };
  }

  /**
   * 取得單一貼文
   */
  async getPost(postId: string) {
    const raw = await this.client.get<{
      id: string;
      creatorId: string;
      caption: string;
      mediaUrls?: string[];
      visibility: string;
      likeCount?: number;
      tipCount?: number;
      createdAt: string;
      updatedAt: string;
    }>(`/api/posts/${postId}`);
    return {
      id: raw.id,
      authorId: raw.creatorId,
      content: raw.caption || '',
      mediaUrls: raw.mediaUrls,
      isPremium: raw.visibility !== 'public',
      likeCount: raw.likeCount ?? 0,
      tipCount: raw.tipCount ?? 0,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    } as Post;
  }

  /**
   * 創建貼文
   */
  async createPost(dto: CreatePostDto) {
    const hasMedia = dto.mediaUrls && dto.mediaUrls.length > 0;
    const body: BackendCreatePostDto = {
      creatorId: 'placeholder', // overridden by backend from JWT
      contentType: hasMedia ? 'image' : 'text',
      caption: dto.content,
      mediaUrls: dto.mediaUrls || [],
      visibility: dto.isPremium ? 'subscribers' : 'public',
    };
    return this.client.post<Post>('/api/posts', body);
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
  async addComment(postId: string, text: string, parentCommentId?: string): Promise<Comment> {
    const body: Record<string, string> = {
      postId,
      userId: 'placeholder', // overridden by backend from JWT
      content: text,
    };
    if (parentCommentId) body.parentCommentId = parentCommentId;
    const raw = await this.client.post<{
      id: string;
      postId: string;
      userId: string;
      content: string;
      parentCommentId?: string | null;
      replyCount?: number;
      createdAt: string;
    }>(`/api/posts/${postId}/comments`, body);
    return {
      commentId: raw.id,
      postId: raw.postId,
      userId: raw.userId,
      username: raw.userId.slice(0, 8), // caller can enrich later
      text: raw.content,
      parentCommentId: raw.parentCommentId || undefined,
      createdAt: raw.createdAt,
      likesCount: 0,
      repliesCount: raw.replyCount || 0,
    };
  }

  /**
   * 取得留言列表（分頁）
   * @param postId 貼文 ID
   * @param cursor 分頁游標（頁碼）
   */
  async getComments(postId: string, cursor?: string): Promise<CursorPaginatedResponse<Comment>> {
    const page = cursor ? parseInt(cursor, 10) : 1;
    const params: Record<string, string> = { page: String(page), limit: '20' };
    const raw = await this.client.get<{
      data: Array<{
        id: string;
        postId: string;
        userId: string;
        content: string;
        parentCommentId?: string | null;
        replyCount?: number;
        createdAt: string;
      }>;
      total: number;
      page: number;
      limit: number;
    }>(`/api/posts/${postId}/comments`, { params });

    // Fetch user profiles for comment authors
    const uniqueUserIds = [...new Set((raw.data || []).map((c) => c.userId))];
    const userMap: Record<string, { displayName: string; avatarUrl?: string }> = {};
    await Promise.all(
      uniqueUserIds.map(async (uid) => {
        try {
          const profile = await this.client.get<{ displayName: string; avatarUrl?: string }>(`/api/users/profile/${uid}`);
          userMap[uid] = { displayName: profile.displayName, avatarUrl: profile.avatarUrl };
        } catch {
          userMap[uid] = { displayName: uid.slice(0, 8) };
        }
      }),
    );

    const comments: Comment[] = (raw.data || []).map((c) => ({
      commentId: c.id,
      postId: c.postId,
      userId: c.userId,
      username: userMap[c.userId]?.displayName || c.userId.slice(0, 8),
      avatarUrl: userMap[c.userId]?.avatarUrl,
      text: c.content,
      parentCommentId: c.parentCommentId || undefined,
      createdAt: c.createdAt,
      likesCount: 0,
      repliesCount: c.replyCount || 0,
    }));

    const hasMore = raw.page * raw.limit < raw.total;
    return { data: comments, hasMore, cursor: hasMore ? String(raw.page + 1) : undefined };
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
  async getTrendingPosts(limit?: number): Promise<Post[]> {
    const params: Record<string, string> = { limit: String(limit || 20) };
    const raw = await this.client.get<{
      data: Array<{
        id: string;
        creatorId: string;
        caption: string;
        mediaUrls?: string[];
        visibility: string;
        likeCount?: number;
        tipCount?: number;
        createdAt: string;
        updatedAt: string;
      }>;
      total: number;
    }>('/api/posts/trending', { params });
    return (raw.data || []).map((p) => ({
      id: p.id,
      authorId: p.creatorId,
      content: p.caption || '',
      mediaUrls: p.mediaUrls,
      isPremium: p.visibility !== 'public',
      likeCount: p.likeCount ?? 0,
      tipCount: p.tipCount ?? 0,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }

  /**
   * 搜尋貼文
   * @param query 搜尋關鍵字
   * @param cursor 分頁游標（頁碼）
   */
  async searchPosts(query: string, cursor?: string): Promise<CursorPaginatedResponse<Post>> {
    const page = cursor ? parseInt(cursor, 10) : 1;
    const params: Record<string, string> = { q: query, page: String(page), limit: '20' };
    const raw = await this.client.get<{
      data: Array<{
        id: string;
        creatorId: string;
        caption: string;
        mediaUrls?: string[];
        visibility: string;
        likeCount?: number;
        tipCount?: number;
        createdAt: string;
        updatedAt: string;
      }>;
      total: number;
      page: number;
      limit: number;
    }>('/api/posts/search', { params });
    const posts: Post[] = (raw.data || []).map((p) => ({
      id: p.id,
      authorId: p.creatorId,
      content: p.caption || '',
      mediaUrls: p.mediaUrls,
      isPremium: p.visibility !== 'public',
      likeCount: p.likeCount ?? 0,
      tipCount: p.tipCount ?? 0,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
    const hasMore = raw.page * raw.limit < raw.total;
    return { data: posts, hasMore, cursor: hasMore ? String(raw.page + 1) : undefined };
  }
}
