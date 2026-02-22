import { getToken } from './auth';

const UPLOAD_BASE = process.env.NEXT_PUBLIC_UPLOAD_URL || 'http://localhost:3008';

export async function uploadImage(file: File): Promise<string> {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);

  // Post directly to media-service to avoid gateway body-parsing
  // issues with multipart/form-data streams.
  // CORS is handled by media-service enableCors().
  const res = await fetch(`${UPLOAD_BASE}/api/media/upload`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to upload image');
  }

  const data = await res.json();
  // media-service returns relative paths like "/uploads/...",
  // prefix with media-service base so images resolve in the browser.
  const url: string = data.url;
  return url.startsWith('http') ? url : `${UPLOAD_BASE}${url}`;
}
