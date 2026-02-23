'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../providers/auth-provider';
import { usersApi, ApiError } from '../../../../lib/api';
import { uploadMedia } from '../../../../lib/upload';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Skeleton,
} from '@suggar-daddy/ui';
import {
  ArrowLeft,
  Camera,
  ShieldCheck,
  Clock,
  XCircle,
  Loader2,
  Upload,
} from 'lucide-react';

type VerificationState = 'unverified' | 'pending' | 'approved' | 'rejected';

export default function VerificationPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [status, setStatus] = useState<VerificationState>('unverified');
  const [rejectionReason, setRejectionReason] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // File & preview
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const result = await usersApi.getVerificationStatus();
      setStatus(result.status as VerificationState);
      setRejectionReason(result.rejectionReason);
    } catch {
      // If endpoint returns 404 or error, assume unverified
      setStatus('unverified');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Clean up object URL on unmount or when file changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setError('');

    // Revoke previous preview
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    setSubmitting(true);
    setError('');

    try {
      const result = await uploadMedia(selectedFile);
      await usersApi.submitVerification(result.url);
      setStatus('pending');
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    } catch (err: unknown) {
      const message = ApiError.getMessage(err, '提交失敗，請稍後再試');
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setStatus('unverified');
    setRejectionReason(undefined);
    setSelectedFile(null);
    setPreviewUrl(null);
    setError('');
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full p-2 hover:bg-gray-100 transition-colors"
          aria-label="返回"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">真人認證</h1>
      </div>

      {/* Loading state */}
      {loading && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <Skeleton className="h-8 w-32 mx-auto" />
            <Skeleton className="h-4 w-48 mx-auto" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </CardContent>
        </Card>
      )}

      {/* Approved state */}
      {!loading && status === 'approved' && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <ShieldCheck className="h-8 w-8 text-green-600" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-semibold text-green-700">
                已通過認證
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                你的身分已通過真人認證，個人檔案將顯示認證標章。
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending state */}
      {!loading && status === 'pending' && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-semibold text-amber-700">審核中</h2>
              <p className="mt-1 text-sm text-gray-500">
                你的認證申請正在審核中，通常需要 1-3 個工作天。
              </p>
              <p className="mt-1 text-sm text-gray-500">
                審核完成後會透過通知告知你結果。
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unverified / Rejected state — upload form */}
      {!loading && (status === 'unverified' || status === 'rejected') && (
        <>
          {/* Rejection notice */}
          {status === 'rejected' && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="flex items-start gap-3 pt-6">
                <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-700">
                    認證未通過
                  </p>
                  {rejectionReason && (
                    <p className="mt-1 text-sm text-red-600">
                      原因：{rejectionReason}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-red-600">
                    請重新提交符合要求的照片。
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">上傳自拍照</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-500">
                請上傳一張清晰的正面自拍照，確保臉部完整可見且光線充足。照片僅用於身分驗證，不會公開顯示。
              </p>

              {/* Preview area */}
              {previewUrl ? (
                <div className="relative mx-auto w-full max-w-xs overflow-hidden rounded-lg border border-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="自拍預覽"
                    className="h-auto w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      if (previewUrl) {
                        URL.revokeObjectURL(previewUrl);
                        setPreviewUrl(null);
                      }
                    }}
                    className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors"
                    aria-label="移除照片"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-12 transition-colors hover:border-neutral-400 hover:bg-gray-100">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200">
                    <Camera className="h-6 w-6 text-gray-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">
                      點擊選擇照片
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      支援 JPG、PNG 格式
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </label>
              )}

              {/* Error message */}
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col gap-3">
                {selectedFile && (
                  <Button
                    className="w-full bg-neutral-900 hover:bg-neutral-800"
                    disabled={submitting}
                    onClick={handleSubmit}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        上傳中...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        提交認證
                      </>
                    )}
                  </Button>
                )}

                {status === 'rejected' && !selectedFile && (
                  <Button
                    className="w-full bg-neutral-900 hover:bg-neutral-800"
                    onClick={handleRetry}
                  >
                    重新提交
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">拍照小提示</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neutral-900" />
                  確保臉部正對鏡頭，五官清晰可辨
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neutral-900" />
                  選擇光線充足的環境，避免逆光或陰影
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neutral-900" />
                  請勿佩戴帽子、墨鏡等遮擋物品
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neutral-900" />
                  照片不會公開，僅供認證審核使用
                </li>
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
