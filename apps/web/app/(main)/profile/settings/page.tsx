'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../../../providers/auth-provider';
import { authApi } from '../../../../lib/api';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
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
  ShieldCheck,
  Info,
  Lock,
  Loader2,
  FileText,
  HelpCircle,
  Mail,
  ScrollText,
  Shield,
  Cookie,
  Users2,
} from 'lucide-react';
import { Toast } from './components/Toast';
import { NotificationSection } from './components/NotificationSection';
import { PrivacySection } from './components/PrivacySection';
import { CreatorSection } from './components/CreatorSection';

const APP_VERSION = '1.0.0';

// --- Zod schema for change password ---
const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, '請輸入舊密碼'),
    newPassword: z.string().min(8, '密碼至少 8 個字元').max(128, '密碼最多 128 個字元'),
    confirmPassword: z.string().min(1, '請確認新密碼'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: '兩次輸入的密碼不一致',
    path: ['confirmPassword'],
  });

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  // Toast state
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error') => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 3000);
    },
    []
  );

  // --- Change password form ---
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting: isPasswordSubmitting },
    reset: resetPasswordForm,
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onChangePassword = async (data: ChangePasswordForm) => {
    try {
      await authApi.changePassword(data.oldPassword, data.newPassword);
      showToast('密碼修改成功', 'success');
      resetPasswordForm();
    } catch {
      showToast('密碼修改失敗，請確認舊密碼是否正確', 'error');
    }
  };

  // --- Logout dialog ---
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleLogout = () => {
    setShowLogoutDialog(false);
    logout();
  };

  if (!user) return null;

  const isCreator = user.userType === 'sugar_baby' || user.userType === 'CREATOR';

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

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

      {/* Account info */}
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

      {/* Account security - Change password */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-gray-500" />
            <CardTitle className="text-base">帳號安全</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onChangePassword)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="oldPassword">舊密碼</Label>
              <Input
                id="oldPassword"
                type="password"
                placeholder="請輸入舊密碼"
                {...register('oldPassword')}
              />
              {errors.oldPassword && (
                <p className="text-xs text-red-500">
                  {errors.oldPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">新密碼</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="至少 8 個字元"
                {...register('newPassword')}
              />
              {errors.newPassword && (
                <p className="text-xs text-red-500">
                  {errors.newPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">確認新密碼</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="再次輸入新密碼"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-red-500">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isPasswordSubmitting}
            >
              {isPasswordSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  修改中...
                </>
              ) : (
                '修改密碼'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Notification settings */}
      <NotificationSection
        preferences={user.preferences}
        showToast={showToast}
      />

      {/* Privacy settings */}
      <PrivacySection
        preferences={user.preferences}
        showToast={showToast}
      />

      {/* Creator settings - only for CREATOR role */}
      {isCreator && <CreatorSection showToast={showToast} />}

      {/* Identity verification */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-gray-500" />
            <CardTitle className="text-base">身份認證</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          <button
            type="button"
            onClick={() => router.push('/profile/verification')}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ShieldCheck className="h-4 w-4 text-gray-500" />
            <span className="flex-1 text-left">真人認證</span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>
        </CardContent>
      </Card>

      {/* Privacy & security links */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">隱私與安全</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <button
            type="button"
            onClick={() => router.push('/profile/settings/blocked')}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ShieldBan className="h-4 w-4 text-gray-500" />
            <span className="flex-1 text-left">封鎖名單</span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>
        </CardContent>
      </Card>

      {/* About & Legal */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-500" />
            <CardTitle className="text-base">關於與法律</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {[
            { href: '/about', icon: Info, label: '關於我們' },
            { href: '/faq', icon: HelpCircle, label: '常見問題' },
            { href: '/contact', icon: Mail, label: '聯絡我們' },
            { href: '/terms', icon: ScrollText, label: '服務條款' },
            { href: '/privacy', icon: Shield, label: '隱私權政策' },
            { href: '/cookie-policy', icon: Cookie, label: 'Cookie 政策' },
            { href: '/community-guidelines', icon: Users2, label: '社群守則' },
          ].map((item) => (
            <button
              key={item.href}
              type="button"
              onClick={() => router.push(item.href)}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <item.icon className="h-4 w-4 text-gray-500" />
              <span className="flex-1 text-left">{item.label}</span>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </button>
          ))}
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
      <Dialog
        open={showLogoutDialog}
        onClose={() => setShowLogoutDialog(false)}
      >
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
          <Button variant="destructive" onClick={handleLogout}>
            確認登出
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
