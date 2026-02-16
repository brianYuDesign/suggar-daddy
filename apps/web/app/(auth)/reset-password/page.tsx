'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Lock, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button, Input, Label } from '@suggar-daddy/ui';
import { authApi, ApiError } from '../../../lib/api';

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, '密碼至少 8 個字元')
      .max(128, '密碼不可超過 128 個字元'),
    confirmPassword: z.string().min(1, '請確認密碼'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '兩次密碼不一致',
    path: ['confirmPassword'],
  });

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

function getPasswordStrength(password: string): {
  level: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { level: 1, label: '弱', color: 'bg-red-500' };
  if (score <= 2) return { level: 2, label: '一般', color: 'bg-yellow-500' };
  if (score <= 3) return { level: 3, label: '中等', color: 'bg-blue-500' };
  return { level: 4, label: '強', color: 'bg-green-500' };
}

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const passwordValue = watch('password', '');
  const strength = useMemo(
    () => getPasswordStrength(passwordValue),
    [passwordValue]
  );

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) {
      setError('無效的重設連結，請重新申請');
      return;
    }
    setError('');
    try {
      await authApi.resetPassword(token, data.password);
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err) {
      setError(
        ApiError.getMessage(err, '重設密碼失敗，連結可能已過期')
      );
    }
  };

  if (!token) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <Lock className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">無效的連結</h1>
        <p className="mt-3 text-sm text-gray-500">
          重設密碼連結無效或已過期，請重新申請。
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          重新申請重設密碼
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">密碼已重設</h1>
        <p className="mt-3 text-sm text-gray-500">
          你的密碼已成功重設，3 秒後將自動導向登入頁面。
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" />
          立即登入
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100">
            <Lock className="h-7 w-7 text-brand-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">重設密碼</h1>
        <p className="mt-2 text-sm text-gray-500">請輸入你的新密碼</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="password">新密碼</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="至少 8 個字元"
              autoComplete="new-password"
              {...register('password')}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-500">{errors.password.message}</p>
          )}
          {passwordValue && (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <div className="flex flex-1 gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full ${
                        i <= strength.level ? strength.color : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-gray-500">{strength.label}</span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">確認密碼</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              placeholder="再次輸入新密碼"
              autoComplete="new-password"
              {...register('confirmPassword')}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowConfirm(!showConfirm)}
              tabIndex={-1}
            >
              {showConfirm ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-red-500">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-brand-500 py-2.5 font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {isSubmitting ? '重設中...' : '重設密碼'}
        </Button>
      </form>

      <p className="mt-6 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" />
          返回登入
        </Link>
      </p>
    </div>
  );
}
