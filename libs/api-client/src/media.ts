import type { ApiClient } from './client';

export interface MediaUploadResult {
  id: string;
  url: string;
  originalUrl: string;
  thumbnailUrl: string | null;
}

export class MediaApi {
  constructor(private readonly client: ApiClient) {}

  /**
   * 上傳單張圖片
   * @param formData - 包含 file 欄位的 FormData
   */
  uploadSingle(formData: FormData) {
    return this.client.post<MediaUploadResult>('/api/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }
}
