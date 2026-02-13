'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../providers/auth-provider';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
} from '@suggar-daddy/ui';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@suggar-daddy/ui';
import {
  ArrowLeft,
  ChevronRight,
  LogOut,
  ShieldBan,
  Info,
} from 'lucide-react';

const APP_VERSION = '1.0.0';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  if (!user) return null;

  const handleLogout = () => {
    setShowLogoutDialog(false);
    logout();
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
        <h1 className="text-xl font-bold text-gray-900">設定</h1>
      </div>

      {/* Account section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">帳號資訊</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">帳號 ID</p>
            <p className="text-sm font-mono text-gray-500 mt-0.5">
              {user.id}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Privacy section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">隱私與安全</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <ShieldBan className="h-4 w-4 text-gray-500" />
            <span>封鎖名單可在使用者檔案頁面管理</span>
          </div>
        </CardContent>
      </Card>

      {/* Logout */}
      <div className="pt-2">
        <Button
          variant="ghost"
          className="w-full justify-center h-12 text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={() => setShowLogoutDialog(true)}
        >
          <LogOut className="mr-2 h-4 w-4" />
          登出帳號
        </Button>
      </div>

      {/* Version info */}
      <div className="flex flex-col items-center gap-1 pt-4 pb-8">
        <div className="flex items-center gap-1.5 text-gray-400">
          <Info className="h-3.5 w-3.5" />
          <span className="text-xs">版本 {APP_VERSION}</span>
        </div>
      </div>

      {/* Logout confirmation dialog */}
      <Dialog open={showLogoutDialog} onClose={() => setShowLogoutDialog(false)}>
        <DialogHeader>
          <DialogTitle>確認登出</DialogTitle>
          <DialogDescription>
            你確定要登出嗎？登出後需要重新登入才能使用。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowLogoutDialog(false)}
          >
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={handleLogout}
          >
            確認登出
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
