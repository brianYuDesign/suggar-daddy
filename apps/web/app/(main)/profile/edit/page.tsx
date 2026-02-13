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
import { ArrowLeft, Loader2 } from 'lucide-react';

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
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function EditProfilePage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      await usersApi.updateProfile(payload as any);
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
            {/* Avatar (read-only placeholder) */}
            <div className="flex flex-col items-center">
              <Avatar
                src={user.avatarUrl}
                fallback={initials}
                size="lg"
                className="h-20 w-20 text-xl"
              />
              <p className="mt-2 text-xs text-gray-400">
                頭像功能即將開放
              </p>
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
