'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../providers/auth-provider';
import { usersApi, ApiError } from '../../../../lib/api';
import type { UserProfileDto } from '@suggar-daddy/dto';
import { useToast } from '../../../../providers/toast-provider';
import { TipModal } from '../../../components/TipModal';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  Separator,
  Skeleton,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@suggar-daddy/ui';
import {
  ArrowLeft,
  Calendar,
  Gift,
  ShieldBan,
  Flag,
  MessageCircle,
  Loader2,
} from 'lucide-react';
import { FollowButton } from '../../../../components/FollowButton';

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

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const userId = params.userId as string;

  const [profile, setProfile] = useState<UserProfileDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [blockSuccess, setBlockSuccess] = useState(false);

  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  const [showTipDialog, setShowTipDialog] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const toast = useToast();

  // Fetch follow status
  useEffect(() => {
    if (userId && currentUser?.id && currentUser.id !== userId) {
      usersApi.getFollowStatus(userId).then((status) => {
        setIsFollowing(status.isFollowing);
      }).catch(() => {});
    }
  }, [userId, currentUser?.id]);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await usersApi.getProfile(userId);
      setProfile(data);
    } catch (err: unknown) {
      const message = ApiError.getMessage(err, '無法載入使用者資料');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchProfile();
    }
  }, [userId, fetchProfile]);

  const handleBlock = async () => {
    setIsBlocking(true);
    try {
      await usersApi.blockUser(userId);
      setBlockSuccess(true);
      toast.success('已成功封鎖此使用者');
    } catch (err: unknown) {
      toast.error(ApiError.getMessage(err, '封鎖失敗，請稍後再試'));
    } finally {
      setIsBlocking(false);
      setShowBlockDialog(false);
    }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) return;
    setIsReporting(true);
    try {
      await usersApi.report({
        targetType: 'user',
        targetId: userId,
        reason: reportReason,
      });
      setReportSuccess(true);
      toast.success('檢舉已送出，我們會盡快處理');
    } catch (err: unknown) {
      toast.error(ApiError.getMessage(err, '檢舉失敗，請稍後再試'));
    } finally {
      setIsReporting(false);
      setShowReportDialog(false);
      setReportReason('');
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-full p-2 hover:bg-gray-100 transition-colors"
            aria-label="返回"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <Skeleton className="h-6 w-32" />
        </div>
        <Card>
          <CardContent className="flex flex-col items-center pt-6 space-y-4">
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-32" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error && !profile) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-full p-2 hover:bg-gray-100 transition-colors"
            aria-label="返回"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">使用者檔案</h1>
        </div>
        <div className="flex flex-col items-center py-16 text-center">
          <p className="text-sm text-red-500 mb-4">{error}</p>
          <Button variant="outline" onClick={fetchProfile}>
            重新載入
          </Button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const initials = profile.displayName?.slice(0, 2) || '??';
  const isOwnProfile = currentUser?.id === profile.id;

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
        <h1 className="text-xl font-bold text-gray-900">使用者檔案</h1>
      </div>

      {/* Success banners */}
      {blockSuccess && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          已成功封鎖此使用者
        </div>
      )}
      {reportSuccess && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          檢舉已送出，我們會盡快處理
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Profile card */}
      <Card>
        <CardContent className="flex flex-col items-center pt-6">
          {/* Avatar */}
          <Avatar
            src={profile.avatarUrl}
            fallback={initials}
            size="lg"
            className="h-24 w-24 text-2xl"
          />

          {/* Display name + badge */}
          <h2 className="mt-4 text-xl font-bold text-gray-900">
            {profile.displayName}
          </h2>
          <Badge
            variant={getRoleBadgeVariant(profile.userType) as 'warning' | 'default'}
            className="mt-2"
          >
            {getRoleLabel(profile.userType)}
          </Badge>

          {/* Verification status */}
          {profile.verificationStatus === 'verified' && (
            <span className="mt-2 text-xs text-green-600 font-medium">
              已驗證
            </span>
          )}

          {/* Follow button */}
          {!isOwnProfile && !blockSuccess && (
            <div className="mt-3">
              <FollowButton
                targetUserId={profile.id}
                initialIsFollowing={isFollowing}
              />
            </div>
          )}

          {/* Bio */}
          <div className="mt-4 w-full">
            <Separator />
            <div className="px-2 py-4">
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                關於我
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {profile.bio || '這位使用者尚未填寫自我介紹'}
              </p>
            </div>
            <Separator />
          </div>

          {/* Member since */}
          <div className="flex items-center gap-2 mt-4 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            <span>加入於 {formatDate(profile.createdAt)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Action buttons (only for other users) */}
      {!isOwnProfile && !blockSuccess && (
        <div className="space-y-3">
          {/* Tip + Message buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              className="h-12 bg-brand-500 hover:bg-brand-600"
              onClick={() => setShowTipDialog(true)}
            >
              <Gift className="mr-2 h-4 w-4" />
              打賞
            </Button>
            <Button
              variant="outline"
              className="h-12 border-brand-200 text-brand-600 hover:bg-brand-50"
              onClick={() => {
                if (currentUser?.id && profile?.id) {
                  const convId = [currentUser.id, profile.id].sort().join('::');
                  router.push(`/messages/${convId}`);
                } else {
                  router.push('/messages');
                }
              }}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              傳訊息
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-12"
              onClick={() => setShowBlockDialog(true)}
            >
              <ShieldBan className="mr-2 h-4 w-4" />
              封鎖
            </Button>
            <Button
              variant="outline"
              className="h-12 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
              onClick={() => setShowReportDialog(true)}
            >
              <Flag className="mr-2 h-4 w-4" />
              檢舉
            </Button>
          </div>
        </div>
      )}

      {/* Block confirmation dialog */}
      <Dialog open={showBlockDialog} onClose={() => setShowBlockDialog(false)}>
        <DialogHeader>
          <DialogTitle>封鎖使用者</DialogTitle>
          <DialogDescription>
            封鎖後，{profile.displayName} 將無法查看你的內容或向你傳送訊息。你確定要繼續嗎？
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowBlockDialog(false)}
            disabled={isBlocking}
          >
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={handleBlock}
            disabled={isBlocking}
          >
            {isBlocking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                處理中...
              </>
            ) : (
              '確認封鎖'
            )}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Tip modal */}
      {showTipDialog && (
        <TipModal
          recipientId={profile.id}
          recipientName={profile.displayName}
          onClose={() => setShowTipDialog(false)}
        />
      )}

      {/* Report dialog */}
      <Dialog open={showReportDialog} onClose={() => setShowReportDialog(false)}>
        <DialogHeader>
          <DialogTitle>檢舉使用者</DialogTitle>
          <DialogDescription>
            請說明檢舉 {profile.displayName} 的原因，我們會盡快審核。
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="請描述檢舉原因..."
            rows={3}
            maxLength={500}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowReportDialog(false);
              setReportReason('');
            }}
            disabled={isReporting}
          >
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={handleReport}
            disabled={isReporting || !reportReason.trim()}
          >
            {isReporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                送出中...
              </>
            ) : (
              '送出檢舉'
            )}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
