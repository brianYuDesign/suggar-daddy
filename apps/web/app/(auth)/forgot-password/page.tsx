'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button, Input, Label } from '@suggar-daddy/ui';
import { authApi, ApiError } from '../../../lib/api';

const forgotPasswordSchema = z.object({
  email: z.string().email('請輸入有效的 Email'),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setError('');
    try {
      await authApi.forgotPassword(data.email);
      setSubmitted(true);
    } catch (err) {
      setError(ApiError.getMessage(err, '發送失敗，請稍後再試'));
    }
  };

  if (submitted) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">信件已發送</h1>
        <p className="mt-3 text-sm text-gray-500">
          重設密碼連結已發送至您的信箱，請查收並依照指示重設密碼。
        </p>
        <Link
          href="/login"
          className="mt-8 inline-flex items-center gap-1 text-sm font-medium text-neutral-700 hover:text-neutral-900"
        >
          <ArrowLeft className="h-4 w-4" />
          返回登入
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100">
            <Mail className="h-7 w-7 text-neutral-700" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">忘記密碼</h1>
        <p className="mt-2 text-sm text-gray-500">
          輸入你的 Email，我們將發送重設密碼連結給你
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            autoComplete="email"
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-neutral-900 py-2.5 font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {isSubmitting ? '發送中...' : '發送重設連結'}
        </Button>
      </form>

      <p className="mt-6 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-sm font-medium text-neutral-700 hover:text-neutral-900"
        >
          <ArrowLeft className="h-4 w-4" />
          返回登入
        </Link>
      </p>
    </div>
  );
}
