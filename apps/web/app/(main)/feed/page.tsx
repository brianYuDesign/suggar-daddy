'use client';

import { useAuth } from '../../../providers/auth-provider';
import { Sparkles } from 'lucide-react';

export default function FeedPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 p-6 text-white">
        <h1 className="text-xl font-bold">
          {user?.displayName ? `嗨，${user.displayName}` : '歡迎'}
        </h1>
        <p className="mt-1 text-sm text-brand-100">
          {user?.role === 'sugar_baby'
            ? '開始分享你的精彩內容吧'
            : '探索你感興趣的創作者'}
        </p>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center py-16 text-center">
        <div className="mb-4 rounded-full bg-brand-50 p-4">
          <Sparkles className="h-8 w-8 text-brand-500" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">
          動態牆即將上線
        </h2>
        <p className="mt-2 max-w-xs text-sm text-gray-500">
          我們正在打造最棒的內容體驗，敬請期待。你可以先到「探索」頁面看看有哪些有趣的人。
        </p>
      </div>
    </div>
  );
}
