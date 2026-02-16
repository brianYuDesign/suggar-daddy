'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { storiesApi, ApiError } from '../../../../lib/api';
import { uploadMedia } from '../../../../lib/upload';
import { Button, cn } from '@suggar-daddy/ui';
import {
  ArrowLeft,
  Send,
  Image,
  Video,
  X,
  AlertCircle,
} from 'lucide-react';

type MediaType = 'IMAGE' | 'VIDEO';

export default function CreateStoryPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType>('IMAGE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      setError('請上傳圖片或影片檔案');
      return;
    }

    // 50MB limit for videos, 10MB for images
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(isVideo ? '影片不可超過 50MB' : '圖片不可超過 10MB');
      return;
    }

    // Clean up previous preview
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);

    setMediaFile(file);
    setMediaType(isVideo ? 'VIDEO' : 'IMAGE');
    setMediaPreview(URL.createObjectURL(file));
  }

  function removeMedia() {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit() {
    if (!mediaFile) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Upload media
      setIsUploading(true);
      const uploadResult = await uploadMedia(mediaFile);
      setIsUploading(false);

      // Get video duration if applicable
      let duration: number | undefined;
      if (mediaType === 'VIDEO' && videoRef.current) {
        duration = Math.ceil(videoRef.current.duration);
      }

      // Create story
      await storiesApi.createStory(uploadResult.id, duration);

      router.push('/feed');
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : '發布限時動態失敗，請稍後再試';
      setError(message);
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="shrink-0"
            aria-label="返回"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-gray-900">發布限時動態</h1>
        </div>

        <Button
          disabled={!mediaFile || isSubmitting}
          onClick={handleSubmit}
          className="bg-brand-500 hover:bg-brand-600 text-white gap-2"
        >
          {isSubmitting ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {isSubmitting
            ? isUploading
              ? '上傳中...'
              : '發布中...'
            : '發布'}
        </Button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Media preview / upload area */}
      {mediaPreview ? (
        <div className="relative overflow-hidden rounded-2xl bg-black">
          {/* Remove button */}
          <button
            type="button"
            onClick={removeMedia}
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            aria-label="移除媒體"
          >
            <X className="h-4 w-4" />
          </button>

          {mediaType === 'VIDEO' ? (
            <video
              ref={videoRef}
              src={mediaPreview}
              className="mx-auto max-h-[60vh] w-full object-contain"
              controls
              playsInline
            />
          ) : (
            <img
              src={mediaPreview}
              alt="預覽"
              className="mx-auto max-h-[60vh] w-full object-contain"
            />
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 py-20">
          <div className="flex gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
              <Image className="h-8 w-8" />
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-50 text-purple-500">
              <Video className="h-8 w-8" />
            </div>
          </div>

          <div className="text-center">
            <p className="text-base font-medium text-gray-700">
              選擇圖片或影片
            </p>
            <p className="mt-1 text-sm text-gray-400">
              圖片最大 10MB，影片最大 50MB
            </p>
          </div>

          <label className="cursor-pointer">
            <Button
              variant="outline"
              className="pointer-events-none border-brand-300 text-brand-600"
            >
              選擇檔案
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </label>
        </div>
      )}

      {/* Info */}
      <div className="rounded-lg bg-gray-50 px-4 py-3">
        <p className="text-xs text-gray-500 leading-relaxed">
          限時動態將在 24 小時後自動消失。圖片將顯示 5 秒，影片將顯示其完整時長。
        </p>
      </div>
    </div>
  );
}
