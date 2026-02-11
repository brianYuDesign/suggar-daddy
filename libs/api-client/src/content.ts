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

export class ContentApi {
  constructor(private readonly client: ApiClient) {}

  getPosts(cursor?: string) {
    const params = cursor ? { cursor } : undefined;
    return this.client.get<{ posts: Post[]; nextCursor?: string }>('/api/posts', { params });
  }

  getPost(postId: string) {
    return this.client.get<Post>(`/api/posts/${postId}`);
  }

  createPost(dto: CreatePostDto) {
    return this.client.post<Post>('/api/posts', dto);
  }

  deletePost(postId: string) {
    return this.client.delete<void>(`/api/posts/${postId}`);
  }

  likePost(postId: string) {
    return this.client.post<Post>(`/api/posts/${postId}/like`);
  }

  unlikePost(postId: string) {
    return this.client.delete<Post>(`/api/posts/${postId}/like`);
  }

  // Moderation
  reportPost(postId: string, reason: string, description?: string) {
    return this.client.post<ContentReport>('/api/moderation/report', { postId, reason, description });
  }
}
