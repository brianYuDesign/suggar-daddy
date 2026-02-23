'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../../../providers/auth-provider';
import { contentApi, ApiError } from '../../../../lib/api';
import {
  Button,
  Card,
  CardContent,
  cn,
} from '@suggar-daddy/ui';
import {
  ArrowLeft,
  Send,
  Lock,
  AlertCircle,
  Image,
  X,
} from 'lucide-react';
import { uploadMedia } from '../../../../lib/upload';

const MAX_CONTENT_LENGTH = 2000;

const createPostSchema = z.object({
  content: z
    .string()
    .min(1, '請輸入內容')
    .max(MAX_CONTENT_LENGTH, `內容不可超過 ${MAX_CONTENT_LENGTH} 字`),
  isPremium: z.boolean(),
});

type CreatePostFormData = z.infer<typeof createPostSchema>;

export default function CreatePostPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreatePostFormData>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      content: '',
      isPremium: false,
    },
  });

  const contentValue = watch('content');
  const isPremiumValue = watch('isPremium');
  const charCount = contentValue?.length || 0;

  function handleMediaSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (files.length + mediaFiles.length > 4) {
      setSubmitError('最多只能上傳 4 張圖片');
      e.target.value = '';
      return;
    }
    setMediaFiles((prev) => [...prev, ...files]);
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setMediaPreviews((prev) => [...prev, ...newPreviews]);
    e.target.value = '';
  }

  function removeMedia(index: number) {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setMediaPreviews((prev) => {
      URL.revokeObjectURL(prev[index]!);
      return prev.filter((_, i) => i !== index);
    });
  }

  const onSubmit = async (data: CreatePostFormData) => {
    try {
      setSubmitError(null);

      let mediaUrls: string[] | undefined;
      if (mediaFiles.length > 0) {
        setUploading(true);
        try {
          const results = await Promise.all(mediaFiles.map(uploadMedia));
          mediaUrls = results.map((r) => r.url);
        } catch {
          setSubmitError('圖片上傳失敗，請稍後再試');
          setUploading(false);
          return;
        }
        setUploading(false);
      }

      await contentApi.createPost({
        content: data.content,
        isPremium: data.isPremium,
        mediaUrls,
      });
      router.push('/feed');
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : '發布失敗，請稍後再試';
      setSubmitError(message);
    }
  };

  const initials = user?.displayName?.slice(0, 2) || '??';

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
          <h1 className="text-lg font-bold text-gray-900">發布動態</h1>
        </div>

        <Button
          type="submit"
          form="create-post-form"
          disabled={isSubmitting || uploading || charCount === 0}
          className="bg-neutral-900 hover:bg-neutral-800 text-white gap-2"
        >
          {isSubmitting ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {isSubmitting ? '發布中...' : uploading ? '上傳中...' : '發布'}
        </Button>
      </div>

      {/* Error banner */}
      {submitError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-600">{submitError}</p>
        </div>
      )}

      {/* Form */}
      <Card>
        <CardContent className="pt-6">
          <form
            id="create-post-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
          >
            {/* Author preview */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-medium text-neutral-900">
                {initials}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {user?.displayName || '使用者'}
                </p>
                <p className="text-xs text-gray-500">
                  {isPremiumValue ? '付費貼文' : '公開貼文'}
                </p>
              </div>
            </div>

            {/* Content textarea */}
            <div>
              <textarea
                {...register('content')}
                placeholder="分享你的想法..."
                rows={6}
                className={cn(
                  'w-full resize-none rounded-lg border bg-white px-4 py-3 text-sm leading-relaxed',
                  'placeholder:text-gray-400',
                  'focus:outline-none focus:ring-2 focus:ring-neutral-800 focus:border-transparent',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  errors.content
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-200'
                )}
                disabled={isSubmitting}
              />

              {/* Character count and error */}
              <div className="mt-2 flex items-center justify-between">
                <div>
                  {errors.content && (
                    <p className="text-xs text-red-500">
                      {errors.content.message}
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs',
                    charCount > MAX_CONTENT_LENGTH
                      ? 'text-red-500 font-medium'
                      : charCount > MAX_CONTENT_LENGTH * 0.9
                        ? 'text-amber-500'
                        : 'text-gray-400'
                  )}
                >
                  {charCount} / {MAX_CONTENT_LENGTH}
                </span>
              </div>
            </div>

            {/* Media upload */}
            <div className="space-y-3">
              {mediaPreviews.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {mediaPreviews.map((preview, idx) => (
                    <div key={idx} className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
                      <img src={preview} alt={`Preview ${idx + 1}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeMedia(idx)}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {mediaFiles.length < 4 && (
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 transition-colors hover:border-neutral-400 hover:text-neutral-900">
                  <Image className="h-5 w-5" />
                  <span>{mediaFiles.length === 0 ? '新增圖片 (最多 4 張)' : `新增更多圖片 (${mediaFiles.length}/4)`}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={handleMediaSelect}
                    disabled={isSubmitting || uploading}
                  />
                </label>
              )}
            </div>

            {/* Premium toggle */}
            <div
              className={cn(
                'flex items-center justify-between rounded-lg border px-4 py-3 transition-colors',
                isPremiumValue
                  ? 'border-neutral-300 bg-neutral-50'
                  : 'border-gray-200 bg-white'
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full',
                    isPremiumValue
                      ? 'bg-neutral-900 text-white'
                      : 'bg-gray-100 text-gray-400'
                  )}
                >
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    付費內容
                  </p>
                  <p className="text-xs text-gray-500">
                    僅付費訂閱者可查看此貼文
                  </p>
                </div>
              </div>

              {/* Toggle switch */}
              <button
                type="button"
                role="switch"
                aria-checked={isPremiumValue}
                aria-label="切換付費內容"
                className={cn(
                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-800 focus-visible:ring-offset-2',
                  isPremiumValue ? 'bg-neutral-900' : 'bg-gray-200'
                )}
                onClick={() => setValue('isPremium', !isPremiumValue)}
                disabled={isSubmitting}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform',
                    isPremiumValue ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>

            {/* Info note */}
            {isPremiumValue && (
              <div className="rounded-lg bg-neutral-50 px-4 py-3">
                <p className="text-xs text-neutral-900 leading-relaxed">
                  付費內容將會對非訂閱者顯示為鎖定狀態，只有付費解鎖後才能查看完整內容。
                </p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
