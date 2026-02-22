'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../providers/auth-provider';
import { usersApi, ApiError } from '../../../../lib/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Avatar,
  Button,
  Card,
  CardContent,
  CardFooter,
  Input,
  Label,
} from '@suggar-daddy/ui';
import { ArrowLeft, Camera, Check, Loader2 } from 'lucide-react';
import { uploadMedia } from '../../../../lib/upload';
import { InterestTagPicker } from '../../../../components/InterestTagPicker';
import { tagsApi } from '../../../../lib/api';

const profileSchema = z.object({
  displayName: z
    .string()
    .min(1, '顯示名稱不能為空')
    .max(50, '顯示名稱最多 50 個字'),
  username: z
    .string()
    .min(3, '用戶名至少 3 個字元')
    .max(20, '用戶名不可超過 20 個字元')
    .regex(/^[a-zA-Z0-9_]+$/, '用戶名只能包含英文字母、數字和底線')
    .optional()
    .or(z.literal('')),
  bio: z
    .string()
    .max(500, '自我介紹最多 500 個字')
    .optional()
    .or(z.literal('')),
  birthDate: z
    .string()
    .optional()
    .or(z.literal('')),
  city: z
    .string()
    .max(100, '城市名稱最多 100 個字')
    .optional()
    .or(z.literal('')),
  lookingFor: z.string().optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function EditProfilePage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagsLoaded, setTagsLoaded] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.displayName || '',
      username: user?.username || '',
      bio: user?.bio || '',
      birthDate: user?.birthDate
        ? new Date(user.birthDate).toISOString().split('T')[0]
        : '',
      city: user?.city || '',
    },
  });

  // Load existing interest tags
  useEffect(() => {
    if (!user?.id) return;
    tagsApi
      .getUserTags(user.id)
      .then((tags) => {
        if (tags && tags.length > 0) {
          setSelectedTagIds(tags.map((t: { id: string }) => t.id));
        }
      })
      .catch(() => {})
      .finally(() => setTagsLoaded(true));
  }, [user?.id]);

  if (!user) return null;

  const initials = user.displayName?.slice(0, 2) || '??';

  const onSubmit = async (data: ProfileFormValues) => {
    setServerError('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        displayName: data.displayName,
      };

      if (data.username) {
        payload.username = data.username;
      }

      if (data.bio !== undefined) {
        payload.bio = data.bio || null;
      }

      if (data.birthDate) {
        payload.birthDate = data.birthDate;
      }

      if (data.city !== undefined) {
        payload.city = data.city || null;
      }

      const preferences: Record<string, unknown> = {};
      if (data.lookingFor) {
        preferences.lookingFor = data.lookingFor;
      }
      if (Object.keys(preferences).length > 0) {
        payload.preferences = preferences;
      }

      await usersApi.updateProfile(payload);

      // Save interest tags
      if (selectedTagIds.length > 0) {
        await tagsApi.updateMyTags(selectedTagIds).catch(() => {});
      }
      await refreshUser();
      setSuccessMessage('個人檔案已更新');
      reset(data);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: unknown) {
      const message = ApiError.getMessage(err, '更新失敗，請稍後再試');
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <h1 className="text-xl font-bold text-gray-900">編輯個人檔案</h1>
      </div>

      {/* Success toast */}
      {successMessage && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700 flex items-center gap-2">
          <Check className="h-4 w-4 flex-shrink-0" />
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardContent className="space-y-6 pt-6">
            {/* Avatar upload */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <Avatar
                  src={user.avatarUrl}
                  fallback={initials}
                  size="lg"
                  className="h-20 w-20 text-xl"
                />
                <label
                  className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-neutral-900 text-white shadow-md hover:bg-neutral-800 transition-colors"
                  aria-label="上傳頭像"
                >
                  {avatarUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={avatarUploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setAvatarUploading(true);
                      try {
                        const result = await uploadMedia(file);
                        await usersApi.updateProfile({ avatarUrl: result.url });
                        await refreshUser();
                      } catch {
                        setServerError('頭像上傳失敗，請稍後再試');
                      } finally {
                        setAvatarUploading(false);
                      }
                    }}
                  />
                </label>
              </div>
              <p className="mt-2 text-xs text-gray-400">點擊相機圖示更換頭像</p>
            </div>

            {/* Display name */}
            <div className="space-y-2">
              <Label htmlFor="displayName">顯示名稱</Label>
              <Input
                id="displayName"
                placeholder="輸入你的名稱"
                maxLength={50}
                {...register('displayName')}
              />
              {errors.displayName && (
                <p className="text-xs text-red-500">
                  {errors.displayName.message}
                </p>
              )}
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">用戶名</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                <Input
                  id="username"
                  placeholder="your_username"
                  maxLength={20}
                  className="pl-7"
                  {...register('username')}
                />
              </div>
              {errors.username && (
                <p className="text-xs text-red-500">
                  {errors.username.message}
                </p>
              )}
              <p className="text-xs text-gray-400">3-20 字元，英文字母、數字和底線</p>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">自我介紹</Label>
              <textarea
                id="bio"
                placeholder="說點什麼關於自己..."
                maxLength={500}
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                {...register('bio')}
              />
              {errors.bio && (
                <p className="text-xs text-red-500">{errors.bio.message}</p>
              )}
            </div>

            {/* Birth date */}
            <div className="space-y-2">
              <Label htmlFor="birthDate">生日</Label>
              <Input
                id="birthDate"
                type="date"
                max={new Date().toISOString().split('T')[0]}
                {...register('birthDate')}
              />
              {errors.birthDate && (
                <p className="text-xs text-red-500">
                  {errors.birthDate.message}
                </p>
              )}
            </div>

            {/* City / Location */}
            <div className="space-y-2">
              <Label htmlFor="city">所在城市</Label>
              <Input
                id="city"
                placeholder="例如：台北、東京、紐約"
                maxLength={100}
                {...register('city')}
              />
              {errors.city && (
                <p className="text-xs text-red-500">{errors.city.message}</p>
              )}
            </div>

            {/* Preferences */}
            <div className="space-y-4 border-t pt-4">
              <p className="text-sm font-medium text-gray-900">偏好設定</p>

              <div className="space-y-2">
                <Label htmlFor="lookingFor">尋找對象</Label>
                <select
                  id="lookingFor"
                  defaultValue={(user.preferences?.lookingFor as string) || ''}
                  {...register('lookingFor')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">不指定</option>
                  <option value="sugar_daddy">Sugar Daddy</option>
                  <option value="sugar_baby">Sugar Baby</option>
                  <option value="both">兩者皆可</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>興趣標籤</Label>
                {tagsLoaded ? (
                  <InterestTagPicker
                    selectedTagIds={selectedTagIds}
                    onChange={setSelectedTagIds}
                  />
                ) : (
                  <div className="flex items-center gap-2 py-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
                    <span className="text-sm text-gray-400">載入標籤中...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Server error */}
            {serverError && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {serverError}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full bg-neutral-900 hover:bg-neutral-800"
              disabled={isSubmitting || !isDirty}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  儲存中...
                </>
              ) : (
                '儲存變更'
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => router.push('/profile')}
            >
              取消
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
