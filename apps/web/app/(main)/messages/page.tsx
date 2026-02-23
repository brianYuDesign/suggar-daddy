'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Radio } from 'lucide-react';
import { Card, Avatar, Skeleton, Button } from '@suggar-daddy/ui';
import { messagingApi, usersApi, ApiError } from '../../../lib/api';
import { getMessagingSocket } from '../../../lib/socket';
import { useAuth } from '../../../providers/auth-provider';
import { timeAgo } from '../../../lib/utils';

/* ------------------------------------------------------------------ */
/*  Local types                                                        */
/* ------------------------------------------------------------------ */
interface Conversation {
  id: string;
  participantIds: string[];
  lastMessageAt?: Date;
}

interface ConversationWithName extends Conversation {
  otherName?: string;
  otherUsername?: string;
  lastMessageText?: string;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function MessagesPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [conversations, setConversations] = useState<ConversationWithName[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** 名稱快取，避免重複查詢 */
  const [nameCache, setNameCache] = useState<Record<string, { displayName: string; username?: string }>>({});

  const enrichConversations = useCallback(
    async (data: Conversation[]): Promise<ConversationWithName[]> => {
      return Promise.all(
        data.map(async (conv) => {
          const otherId =
            conv.participantIds.find((id) => id !== user?.id) ??
            conv.participantIds[0] ??
            '';

          // Fetch name + last message in parallel
          const [nameResult, messagesResult] = await Promise.allSettled([
            nameCache[otherId]
              ? Promise.resolve(nameCache[otherId])
              : usersApi.getProfile(otherId).then((p) => {
                  const info = { displayName: p.displayName, username: p.username };
                  setNameCache((prev) => ({ ...prev, [otherId]: info }));
                  return info;
                }),
            messagingApi.getMessages(conv.id),
          ]);

          const otherInfo =
            nameResult.status === 'fulfilled' ? nameResult.value : undefined;
          const messages =
            messagesResult.status === 'fulfilled' ? messagesResult.value : [];
          const lastMsg = messages[0];

          return {
            ...conv,
            otherName: otherInfo?.displayName,
            otherUsername: otherInfo?.username,
            lastMessageText: lastMsg?.content,
          };
        })
      );
    },
    [user?.id, nameCache]
  );

  /* ---------- 初始載入 ---------- */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = (await messagingApi.getConversations()) as unknown as Conversation[];
        const enriched = await enrichConversations(data);
        if (!cancelled) setConversations(enriched);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : '無法載入對話');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  /* ---------- WebSocket：收到新訊息時刷新列表 ---------- */
  useEffect(() => {
    if (!user?.id) return;

    const socket = getMessagingSocket();

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('join', { userId: user.id });

    async function handleNewMessage() {
      // 有新訊息 → 重新拉取對話列表以更新排序 / lastMessageAt
      try {
        const data = (await messagingApi.getConversations()) as unknown as Conversation[];
        const enriched = await enrichConversations(data);
        setConversations(enriched);
      } catch {
        /* silent */
      }
    }

    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [user?.id]);

  /* ---------- helpers ---------- */
  function getOtherParticipantId(conv: Conversation): string {
    return conv.participantIds.find((id) => id !== user?.id) ?? conv.participantIds[0] ?? '';
  }

  function getInitials(id: string): string {
    return id.slice(0, 2).toUpperCase();
  }

  /* ---------- render ---------- */
  if (loading) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-bold text-gray-900">訊息</h1>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl bg-white p-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  const isCreator = user?.permissionRole === 'creator' || user?.userType === 'sugar_baby';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">訊息</h1>
        {isCreator && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/messages/broadcast')}
            className="gap-1.5"
          >
            <Radio className="h-4 w-4" />
            廣播
          </Button>
        )}
      </div>

      {conversations.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center py-16 text-center">
          <div className="mb-4 rounded-full bg-neutral-50 p-4">
            <MessageCircle className="h-8 w-8 text-neutral-700" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">還沒有任何對話</h2>
          <p className="mt-2 max-w-xs text-sm text-gray-500">
            去探索頁面找到你感興趣的人，開始對話吧！
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => {
            return (
              <Card
                key={conv.id}
                className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-gray-50 active:bg-gray-100"
                onClick={() => router.push(`/messages/${conv.id}`)}
              >
                <Avatar fallback={getInitials(conv.otherName || getOtherParticipantId(conv))} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {conv.otherName || '使用者'}
                      </p>
                      {conv.otherUsername && (
                        <span className="text-sm text-gray-500">@{conv.otherUsername}</span>
                      )}
                    </div>
                    {conv.lastMessageAt && (
                      <span className="shrink-0 text-xs text-gray-400">
                        {timeAgo(conv.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  {conv.lastMessageText && (
                    <p className="truncate text-xs text-gray-500 mt-0.5">
                      {conv.lastMessageText}
                    </p>
                  )}
                </div>
                <MessageCircle className="h-4 w-4 shrink-0 text-gray-400" />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
