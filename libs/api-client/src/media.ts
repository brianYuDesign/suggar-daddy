import type { ApiClient } from './client';

// ==================== Types ====================

export interface UploadResult {
  id: string;
  url: string;
  thumbnailUrl?: string;
  publicId: string;
  format: string;
  resourceType: string;
  width?: number;
  height?: number;
  size: number;
}

export interface MediaItem {
  id: string;
  userId: string;
  filename: string;
  mediaType: string;
  url: string;
  storagePath: string;
  createdAt: string;
}

// ==================== API Class ====================

export class MediaApi {
  constructor(private readonly client: ApiClient) {}

  /**
   * 上傳單一檔案至 Cloudinary
   * @description 注意：需使用 FormData，不設 Content-Type header
   */
  async uploadSingle(file: File, token?: string): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Use raw fetch since ApiClient sets Content-Type: application/json
    const res = await fetch('/api/upload/single', {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      throw new Error('Upload failed');
    }

    return res.json();
  }

  /**
   * 刪除已上傳的媒體
   */
  deleteMedia(mediaId: string) {
    return this.client.delete<void>(`/api/upload/${mediaId}`);
  }

  /**
   * 取得媒體列表
   */
  getMediaList(params?: { page?: number; limit?: number; userId?: string }) {
    return this.client.get<{ data: MediaItem[]; total: number }>('/api/media', { params });
  }
}
