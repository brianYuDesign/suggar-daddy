'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '../../../providers/auth-provider';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  Separator,
} from '@suggar-daddy/ui';
import {
  Settings,
  Pencil,
  LogOut,
  Calendar,
  ChevronRight,
} from 'lucide-react';

function getRoleLabel(role: string): string {
  switch (role) {
    case 'sugar_baby':
      return '創作者';
    case 'sugar_daddy':
      return '探索者';
    default:
      return role;
  }
}

function getRoleBadgeVariant(role: string) {
  return role === 'sugar_baby' ? 'warning' : 'default';
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) return null;

  const initials = user.displayName?.slice(0, 2) || '??';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-xl font-bold text-gray-900">我的檔案</h1>
      </div>

      {/* Profile card */}
      <Card>
        <CardContent className="flex flex-col items-center pt-6">
          {/* Avatar */}
          <Avatar
            src={user.avatarUrl}
            fallback={initials}
            size="lg"
            className="h-24 w-24 text-2xl"
          />

          {/* Display name + badge */}
          <h2 className="mt-4 text-xl font-bold text-gray-900">
            {user.displayName}
          </h2>
          <Badge
            variant={getRoleBadgeVariant(user.role) as 'warning' | 'default'}
            className="mt-2"
          >
            {getRoleLabel(user.role)}
          </Badge>

          {/* Verification status */}
          {user.verificationStatus === 'verified' && (
            <span className="mt-2 text-xs text-green-600 font-medium">
              已驗證
            </span>
          )}

          {/* Bio */}
          <div className="mt-4 w-full">
            <Separator />
            <div className="px-2 py-4">
              <h3 className="text-sm font-medium text-gray-500 mb-1">關於我</h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {user.bio || '尚未填寫自我介紹'}
              </p>
            </div>
            <Separator />
          </div>

          {/* Member since */}
          <div className="flex items-center gap-2 mt-4 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            <span>加入於 {formatDate(user.createdAt)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="space-y-3">
        <Button
          variant="outline"
          className="w-full justify-between h-12"
          onClick={() => router.push('/profile/edit')}
        >
          <span className="flex items-center gap-3">
            <Pencil className="h-4 w-4 text-brand-500" />
            編輯個人檔案
          </span>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </Button>

        <Button
          variant="outline"
          className="w-full justify-between h-12"
          onClick={() => router.push('/profile/settings')}
        >
          <span className="flex items-center gap-3">
            <Settings className="h-4 w-4 text-brand-500" />
            設定
          </span>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </Button>

        <Separator className="my-2" />

        <Button
          variant="ghost"
          className="w-full justify-center h-12 text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={logout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          登出
        </Button>
      </div>
    </div>
  );
}
