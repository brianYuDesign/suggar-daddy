'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Loader2, Mail, ArrowLeft } from 'lucide-react';
import { Button } from '@suggar-daddy/ui';
import { authApi, ApiError } from '../../../lib/api';

type VerifyState = 'verifying' | 'success' | 'error' | 'no-token';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [state, setState] = useState<VerifyState>(
    token ? 'verifying' : 'no-token'
  );
  const [errorMessage, setErrorMessage] = useState('');
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const verify = useCallback(async () => {
    if (!token) {
      setState('no-token');
      return;
    }
    setState('verifying');
    try {
      await authApi.verifyEmail(token);
      setState('success');
      setCountdown(3);
    } catch (err) {
      setState('error');
      setErrorMessage(
        ApiError.getMessage(err, '驗證失敗，連結可能已過期或無效')
      );
    }
  }, [token]);

  useEffect(() => {
    verify();
  }, [verify]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => {
      if (countdown === 1) {
        router.push('/login');
      } else {
        setCountdown(countdown - 1);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, router]);

  const handleResend = async () => {
    setResending(true);
    setResendSuccess(false);
    try {
      await authApi.resendVerification();
      setResendSuccess(true);
    } catch (err) {
      setErrorMessage(
        ApiError.getMessage(err, '重新發送失敗，請稍後再試')
      );
    } finally {
      setResending(false);
    }
  };

  if (state === 'verifying') {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 flex justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-brand-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">驗證中</h1>
        <p className="mt-3 text-sm text-gray-500">
          正在驗證你的電子郵件，請稍候...
        </p>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">驗證成功</h1>
        <p className="mt-3 text-sm text-gray-500">
          你的電子郵件已驗證成功，{countdown} 秒後將自動導向登入頁面。
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

  if (state === 'no-token') {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100">
            <Mail className="h-7 w-7 text-yellow-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">缺少驗證碼</h1>
        <p className="mt-3 text-sm text-gray-500">
          請從驗證信中的連結進入此頁面。
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" />
          返回登入
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm text-center">
      <div className="mb-6 flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <XCircle className="h-8 w-8 text-red-600" />
        </div>
      </div>
      <h1 className="text-2xl font-bold text-gray-900">驗證失敗</h1>
      <p className="mt-3 text-sm text-gray-500">{errorMessage}</p>

      <div className="mt-6 space-y-3">
        {resendSuccess ? (
          <p className="text-sm text-green-600">
            驗證信已重新發送，請查收信箱。
          </p>
        ) : (
          <Button
            onClick={handleResend}
            disabled={resending}
            className="w-full bg-brand-500 py-2.5 font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {resending ? '發送中...' : '重新發送驗證信'}
          </Button>
        )}
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" />
          返回登入
        </Link>
      </div>
    </div>
  );
}
