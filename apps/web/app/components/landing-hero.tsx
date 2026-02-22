'use client';

import Link from 'next/link';
import { Heart, Shield, MessageCircle, Sparkles } from 'lucide-react';
import { Button } from '@suggar-daddy/ui';
import { useAuth } from '../../providers/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const features = [
  {
    icon: Heart,
    title: '智慧配對',
    desc: '根據你的偏好，精準推薦合適對象',
  },
  {
    icon: Shield,
    title: '安全可靠',
    desc: '嚴格驗證機制，保護你的隱私安全',
  },
  {
    icon: MessageCircle,
    title: '即時互動',
    desc: '配對成功後立即開聊，不錯過任何緣分',
  },
  {
    icon: Sparkles,
    title: '專屬內容',
    desc: '訂閱喜愛的創作者，解鎖獨家內容',
  },
];

export function LandingHero() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/feed');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      {/* Hero Section */}
      <section className="relative flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        {/* Gradient background */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand-50 via-white to-white" />

        <div className="relative z-10 mx-auto max-w-lg">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 text-sm font-medium text-brand-800">
            <Sparkles className="h-4 w-4" />
            探索理想關係
          </div>

          <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            在{' '}
            <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">
              Suggar Daddy
            </span>
            <br />
            找到你的人
          </h1>

          <p className="mb-8 text-lg text-gray-600">
            不論你是創作者還是欣賞者，這裡都能讓你遇見對的人、建立真實的連結。
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/register">
              <Button className="w-full bg-brand-500 px-8 py-3 text-base font-semibold text-white hover:bg-brand-600 sm:w-auto">
                免費加入
              </Button>
            </Link>
            <Link href="/login">
              <Button className="w-full border border-gray-300 bg-white px-8 py-3 text-base font-semibold text-gray-700 hover:bg-gray-50 sm:w-auto">
                登入帳號
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-gray-50 px-6 py-16">
        <div className="mx-auto max-w-lg sm:max-w-4xl">
          <h2 className="mb-10 text-center text-2xl font-bold text-gray-900">
            為什麼選擇我們
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-3 inline-flex rounded-xl bg-brand-100 p-2.5">
                  <f.icon className="h-5 w-5 text-brand-600" />
                </div>
                <h3 className="mb-1.5 text-lg font-semibold text-gray-900">
                  {f.title}
                </h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
