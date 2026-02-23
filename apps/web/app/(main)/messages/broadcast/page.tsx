'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../providers/auth-provider';
import { messagingApi, ApiError } from '../../../../lib/api';
import { useToast } from '../../../../providers/toast-provider';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@suggar-daddy/ui';
import { ArrowLeft, Send, Radio, Loader2, Users, Crown } from 'lucide-react';

const MAX_CONTENT_LENGTH = 1000;

type Audience = 'followers' | 'subscribers';

const AUDIENCE_OPTIONS: {
  value: Audience;
  label: string;
  description: string;
  icon: typeof Users;
}[] = [
  {
    value: 'followers',
    label: '所有粉絲',
    description: '發送給所有追蹤你的人',
    icon: Users,
  },
  {
    value: 'subscribers',
    label: '訂閱者',
    description: '僅發送給付費訂閱的粉絲',
    icon: Crown,
  },
];

export default function BroadcastPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const toast = useToast();

  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<Audience>('followers');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const isCreator =
    user?.permissionRole === 'creator' || user?.userType === 'sugar_baby';

  /* ---------- Access denied ---------- */
  if (!authLoading && !isCreator) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/messages')}
            className="rounded-full p-2 hover:bg-gray-100 transition-colors"
            aria-label="返回訊息"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">群發訊息</h1>
        </div>

        <div className="flex flex-col items-center py-16 text-center">
          <div className="mb-4 rounded-full bg-gray-100 p-4">
            <Radio className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">無法存取</h2>
          <p className="mt-2 max-w-xs text-sm text-gray-500">
            群發訊息功能僅限創作者使用。請先升級為創作者帳號。
          </p>
          <Button
            variant="outline"
            className="mt-6"
            onClick={() => router.push('/messages')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回訊息
          </Button>
        </div>
      </div>
    );
  }

  /* ---------- Helpers ---------- */
  const audienceLabel =
    AUDIENCE_OPTIONS.find((o) => o.value === audience)?.label ?? audience;

  const canSend = message.trim().length > 0 && message.length <= MAX_CONTENT_LENGTH;

  async function handleSend() {
    if (!canSend) return;
    setSending(true);
    try {
      await messagingApi.sendBroadcast({ content: message.trim(), audience });
      toast.success('廣播訊息已成功發送！');
      router.push('/messages/broadcast/history');
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : '發送失敗，請稍後再試'
      );
    } finally {
      setSending(false);
      setConfirmOpen(false);
    }
  }

  /* ---------- Render ---------- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/messages')}
          className="rounded-full p-2 hover:bg-gray-100 transition-colors"
          aria-label="返回訊息"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-neutral-700" />
          <h1 className="text-xl font-bold text-gray-900">群發訊息</h1>
        </div>
      </div>

      {/* Message textarea */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">訊息內容</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="輸入你想廣播的訊息..."
            maxLength={MAX_CONTENT_LENGTH}
            rows={6}
            className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-800"
          />
          <p
            className={`mt-2 text-right text-xs ${
              message.length > MAX_CONTENT_LENGTH
                ? 'text-red-500'
                : 'text-gray-400'
            }`}
          >
            {message.length} / {MAX_CONTENT_LENGTH}
          </p>
        </CardContent>
      </Card>

      {/* Audience selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">發送對象</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {AUDIENCE_OPTIONS.map((option) => {
              const Icon = option.icon;
              const selected = audience === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAudience(option.value)}
                  className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors ${
                    selected
                      ? 'border-neutral-500 bg-neutral-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div
                    className={`mt-0.5 rounded-full p-2 ${
                      selected
                        ? 'bg-neutral-100 text-neutral-900'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p
                      className={`text-sm font-semibold ${
                        selected ? 'text-neutral-900' : 'text-gray-900'
                      }`}
                    >
                      {option.label}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {option.description}
                    </p>
                  </div>
                  {/* Radio indicator */}
                  <div
                    className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${
                      selected
                        ? 'border-neutral-900 bg-neutral-900'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    {selected && (
                      <div className="flex h-full w-full items-center justify-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Send button */}
      <Button
        className="w-full"
        disabled={!canSend || sending}
        onClick={() => setConfirmOpen(true)}
      >
        {sending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Send className="mr-2 h-4 w-4" />
        )}
        發送廣播
      </Button>

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogHeader>
          <DialogTitle>確認發送？</DialogTitle>
          <DialogDescription>
            你即將向「{audienceLabel}」發送廣播訊息，此操作無法撤回。確定要發送嗎？
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 rounded-lg bg-gray-50 p-3">
          <p className="text-sm text-gray-700 whitespace-pre-wrap break-words line-clamp-4">
            {message}
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setConfirmOpen(false)}
            disabled={sending}
          >
            取消
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            確認發送
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
