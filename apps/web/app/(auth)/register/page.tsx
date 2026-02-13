'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Crown, Heart } from 'lucide-react';
import { Button, Input, Label } from '@suggar-daddy/ui';
import { useAuth } from '../../../providers/auth-provider';
import { ApiError } from '../../../lib/api';

const registerSchema = z.object({
  email: z.string().email('請輸入有效的 Email'),
  password: z
    .string()
    .min(8, '密碼至少 8 個字元')
    .max(128, '密碼不可超過 128 個字元'),
  displayName: z
    .string()
    .min(1, '請輸入暱稱')
    .max(50, '暱稱不可超過 50 個字元'),
  role: z.enum(['sugar_baby', 'sugar_daddy'], {
    message: '請選擇你的身份',
  }),
});

type RegisterForm = z.infer<typeof registerSchema>;

const roles = [
  {
    value: 'sugar_daddy' as const,
    icon: Crown,
    label: 'Sugar Daddy',
    desc: '探索精彩內容，支持喜愛的創作者',
  },
  {
    value: 'sugar_baby' as const,
    icon: Heart,
    label: 'Sugar Baby',
    desc: '分享獨家內容，建立你的粉絲社群',
  },
];

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: RegisterForm) => {
    setError('');
    try {
      await registerUser(data);
    } catch (err) {
      setError(ApiError.getMessage(err, '註冊失敗，請稍後再試'));
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">建立帳號</h1>
        <p className="mt-2 text-sm text-gray-500">開始你的 Suggar Daddy 旅程</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Role Selection */}
        <div className="space-y-2">
          <Label>選擇你的身份</Label>
          <div className="grid grid-cols-2 gap-3">
            {roles.map((r) => {
              const isSelected = selectedRole === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() =>
                    setValue('role', r.value, { shouldValidate: true })
                  }
                  className={`flex flex-col items-center rounded-xl border-2 p-4 transition-all ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <r.icon
                    className={`mb-2 h-6 w-6 ${
                      isSelected ? 'text-brand-600' : 'text-gray-400'
                    }`}
                  />
                  <span
                    className={`text-sm font-semibold ${
                      isSelected ? 'text-brand-700' : 'text-gray-700'
                    }`}
                  >
                    {r.label}
                  </span>
                  <span className="mt-1 text-center text-xs text-gray-500">
                    {r.desc}
                  </span>
                </button>
              );
            })}
          </div>
          {errors.role && (
            <p className="text-xs text-red-500">{errors.role.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="displayName">暱稱</Label>
          <Input
            id="displayName"
            type="text"
            placeholder="你的暱稱"
            autoComplete="nickname"
            {...register('displayName')}
          />
          {errors.displayName && (
            <p className="text-xs text-red-500">
              {errors.displayName.message}
            </p>
          )}
        </div>

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

        <div className="space-y-1.5">
          <Label htmlFor="password">密碼</Label>
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
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-brand-500 py-2.5 font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {isSubmitting ? '建立中...' : '建立帳號'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        已經有帳號？{' '}
        <Link
          href="/login"
          className="font-medium text-brand-600 hover:text-brand-700"
        >
          登入
        </Link>
      </p>
    </div>
  );
}
