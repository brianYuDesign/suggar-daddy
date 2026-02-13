'use client';

import { useState } from 'react';
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
import { ArrowLeft, Camera, Loader2 } from 'lucide-react';
import { uploadMedia } from '../../../../lib/upload';

const profileSchema = z.object({
  displayName: z
    .string()
    .min(1, '顯示名稱不能為空')
    .max(50, '顯示名稱最多 50 個字'),
  bio: z
    .string()
    .max(500, '自我介紹最多 500 個字')
    .optional()
    .or(z.literal('')),
  birthDate: z
    .string()
    .optional()
    .or(z.literal('')),
  lookingFor: z.string().optional(),
  interests: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function EditProfilePage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.displayName || '',
      bio: user?.bio || '',
      birthDate: user?.birthDate
        ? new Date(user.birthDate).toISOString().split('T')[0]
        : '',
    },
  });

  if (!user) return null;

  const initials = user.displayName?.slice(0, 2) || '??';

  const onSubmit = async (data: ProfileFormValues) => {
    setServerError('');
    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        displayName: data.displayName,
      };

      if (data.bio !== undefined) {
        payload.bio = data.bio || null;
      }

      if (data.birthDate) {
        payload.birthDate = data.birthDate;
      }

      const preferences: Record<string, unknown> = {};
      const formValues = data;
      if (formValues.lookingFor) {
        preferences.lookingFor = formValues.lookingFor;
      }
      if (formValues.interests) {
        preferences.interests = formValues.interests
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean);
      }
      if (Object.keys(preferences).length > 0) {
        payload.preferences = preferences;
      }

      await usersApi.updateProfile(payload);
      await refreshUser();
      router.back();
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
                  className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-brand-500 text-white shadow-md hover:bg-brand-600 transition-colors"
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
                <Label htmlFor="interests">興趣標籤</Label>
                <Input
                  id="interests"
                  placeholder="旅遊, 美食, 運動 (以逗號分隔)"
                  defaultValue={
                    Array.isArray(user.preferences?.interests)
                      ? (user.preferences.interests as string[]).join(', ')
                      : ''
                  }
                  {...register('interests')}
                />
                <p className="text-xs text-gray-400">多個興趣請以逗號分隔</p>
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
              className="w-full bg-brand-500 hover:bg-brand-600"
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
              onClick={() => router.back()}
            >
              取消
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
