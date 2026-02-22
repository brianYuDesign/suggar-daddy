import { apiClient } from './client';

// Types
export interface Upload {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number;
  url?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadProgress {
  fileId: string;
  progress: number;
  loaded: number;
  total: number;
  speed: number; // bytes per second
  remainingTime: number; // seconds
}

export interface UploadResponse {
  upload: Upload;
  url: string;
}

export interface UploadRequest {
  file: File;
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal;
}

// Uploads API
export const uploadsApi = {
  /**
   * 上傳文件
   * @param file - 要上傳的文件
   * @param onProgress - 進度回調
   * @param signal - AbortSignal 用於取消上傳
   * @returns 上傳結果
   */
  uploadFile: async (
    file: File,
    onProgress?: (progress: UploadProgress) => void,
    signal?: AbortSignal
  ): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const startTime = Date.now();
    let lastLoadedTime = startTime;
    let lastLoaded = 0;

    try {
      const response = await apiClient.post<UploadResponse>(
        '/uploads',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          signal,
          onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const loaded = progressEvent.loaded;
              const total = progressEvent.total;
              const progress = (loaded / total) * 100;

              const currentTime = Date.now();
              const timeElapsed = (currentTime - lastLoadedTime) / 1000; // seconds
              const loadedSinceLast = loaded - lastLoaded;
              const speed = timeElapsed > 0 ? loadedSinceLast / timeElapsed : 0;

              const totalTimeElapsed = (currentTime - startTime) / 1000;
              const averageSpeed = totalTimeElapsed > 0 ? loaded / totalTimeElapsed : 0;
              const remainingBytes = total - loaded;
              const remainingTime =
                averageSpeed > 0 ? remainingBytes / averageSpeed : 0;

              onProgress({
                fileId: file.name,
                progress: Math.round(progress * 100) / 100,
                loaded,
                total,
                speed: Math.round(speed),
                remainingTime: Math.round(remainingTime),
              });

              lastLoadedTime = currentTime;
              lastLoaded = loaded;
            }
          },
        }
      );

      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && (error as { code?: string }).code === 'ERR_CANCELED') {
        throw new Error('Upload cancelled');
      }
      throw error;
    }
  },

  /**
   * 繼續上傳（恢復中斷的上傳）
   * @param fileId - 文件 ID
   * @param file - 文件
   * @param fromByte - 開始位置（字節）
   * @param onProgress - 進度回調
   * @returns 上傳結果
   */
  resumeUpload: async (
    fileId: string,
    file: File,
    fromByte: number = 0,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResponse> => {
    const formData = new FormData();
    
    // 從指定位置開始上傳
    const blob = file.slice(fromByte);
    formData.append('file', blob);

    const startTime = Date.now();

    const response = await apiClient.post<UploadResponse>(
      `/uploads/${fileId}/resume`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Content-Range': `bytes ${fromByte}-${file.size - 1}/${file.size}`,
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const loaded = fromByte + progressEvent.loaded;
            const total = file.size;
            const progress = (loaded / total) * 100;

            const totalTimeElapsed = (Date.now() - startTime) / 1000;
            const speed =
              totalTimeElapsed > 0
                ? progressEvent.loaded / totalTimeElapsed
                : 0;
            const remainingBytes = total - loaded;
            const remainingTime =
              speed > 0 ? remainingBytes / speed : 0;

            onProgress({
              fileId,
              progress: Math.round(progress * 100) / 100,
              loaded,
              total,
              speed: Math.round(speed),
              remainingTime: Math.round(remainingTime),
            });
          }
        },
      }
    );

    return response.data;
  },

  /**
   * 取消上傳
   * @param fileId - 文件 ID
   * @returns 成功消息
   */
  cancelUpload: async (fileId: string): Promise<{ message: string }> => {
    return apiClient.post(`/uploads/${fileId}/cancel`);
  },

  /**
   * 獲取上傳狀態
   * @param fileId - 文件 ID
   * @returns 上傳狀態
   */
  getUploadStatus: async (fileId: string): Promise<Upload> => {
    return apiClient.get(`/uploads/${fileId}/status`);
  },

  /**
   * 刪除上傳的文件
   * @param fileId - 文件 ID
   * @returns 成功消息
   */
  deleteUpload: async (fileId: string): Promise<{ message: string }> => {
    return apiClient.delete(`/uploads/${fileId}`);
  },

  /**
   * 獲取用戶的上傳列表
   * @param userId - 用戶 ID
   * @param page - 頁碼
   * @param limit - 每頁數量
   * @returns 上傳列表
   */
  getUploads: async (
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    uploads: Upload[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      hasMore: boolean;
    };
  }> => {
    return apiClient.get(
      `/uploads?userId=${userId}&page=${page}&limit=${limit}`
    );
  },

  /**
   * 檢查文件是否已存在
   * @param hash - 文件哈希值
   * @returns 存在狀態
   */
  checkFileExists: async (hash: string): Promise<{
    exists: boolean;
    upload?: Upload;
  }> => {
    return apiClient.get(`/uploads/check/${hash}`);
  },

  /**
   * 初始化分片上傳
   * @param filename - 文件名
   * @param totalSize - 文件總大小
   * @param chunkSize - 分片大小
   * @returns 上傳會話
   */
  initChunkedUpload: async (
    filename: string,
    totalSize: number,
    chunkSize: number = 5 * 1024 * 1024 // 5MB
  ): Promise<{
    uploadId: string;
    chunkSize: number;
    totalChunks: number;
  }> => {
    return apiClient.post('/uploads/chunked/init', {
      filename,
      totalSize,
      chunkSize,
    });
  },

  /**
   * 上傳分片
   * @param uploadId - 上傳會話 ID
   * @param chunkIndex - 分片索引
   * @param chunk - 分片數據
   * @param onProgress - 進度回調
   * @returns 成功消息
   */
  uploadChunk: async (
    uploadId: string,
    chunkIndex: number,
    chunk: Blob,
    onProgress?: (progress: number) => void
  ): Promise<{ message: string }> => {
    const formData = new FormData();
    formData.append('chunk', chunk);

    return apiClient.post(
      `/uploads/chunked/${uploadId}/chunk/${chunkIndex}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = (progressEvent.loaded / progressEvent.total) * 100;
            onProgress(progress);
          }
        },
      }
    );
  },

  /**
   * 完成分片上傳
   * @param uploadId - 上傳會話 ID
   * @returns 上傳結果
   */
  completeChunkedUpload: async (
    uploadId: string
  ): Promise<UploadResponse> => {
    return apiClient.post(`/uploads/chunked/${uploadId}/complete`);
  },
};

export default uploadsApi;
