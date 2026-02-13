const TOKEN_KEY = 'sd_access_token';

export interface UploadResult {
  id: string;
  url: string;
  originalUrl?: string;
  thumbnailUrl?: string;
}

/**
 * Upload a file to the media service via FormData.
 * Returns the uploaded media metadata including the URL.
 */
export async function uploadMedia(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);

  const token =
    typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch('/api/media/upload', {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    throw new Error('上傳失敗，請稍後再試');
  }

  const data = await res.json();
  return {
    id: data.id,
    url: data.originalUrl || data.url || '',
    originalUrl: data.originalUrl,
    thumbnailUrl: data.thumbnailUrl,
  };
}
