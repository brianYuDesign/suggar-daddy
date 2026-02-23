'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, Diamond, Paperclip, X, Check, CheckCheck, MoreVertical, ShieldBan, ShieldCheck, ImageIcon, Loader2 } from 'lucide-react';
import { Button, Input, Skeleton, Avatar } from '@suggar-daddy/ui';
import { messagingApi, usersApi, mediaApi, ApiError } from '../../../../lib/api';

interface DiamondGateInfo {
  diamondCost: number;
  threshold: number;
  sentCount: number;
}

interface DmUnlockInfo {
  message: string;
  diamondCost: number;
}
import { getMessagingSocket } from '../../../../lib/socket';
import { useAuth } from '../../../../providers/auth-provider';
import { timeAgo } from '../../../../lib/utils';

/* ------------------------------------------------------------------ */
/*  Local types                                                        */
/* ------------------------------------------------------------------ */
interface MessageAttachment {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  attachments?: MessageAttachment[];
  createdAt: Date;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function ChatRoomPage() {
  const params = useParams<{ conversationId: string }>();
  const conversationId = decodeURIComponent(params.conversationId);
  const { user } = useAuth();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [diamondGate, setDiamondGate] = useState<DiamondGateInfo | null>(null);
  const [dmUnlock, setDmUnlock] = useState<DmUnlockInfo | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  // Pagination state
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  // Read receipts
  const [readReceipts, setReadReceipts] = useState<Record<string, { messageId: string; readAt: string }>>({});

  // Online status
  const [otherUser, setOtherUser] = useState<{ id: string; displayName?: string; username?: string } | null>(null);
  const [otherOnline, setOtherOnline] = useState(false);

  // Image upload
  const [imagePreview, setImagePreview] = useState<{ file: File; url: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Block
  const [showMenu, setShowMenu] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);

  // Fullscreen image
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  /* ---------- scroll helper ---------- */
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  /* ---------- fetch initial messages via REST ---------- */
  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      const data = await messagingApi.getMessages(conversationId);
      // API returns newest-first; reverse so oldest is at top, newest at bottom
      const reversed = [...data.messages].reverse() as unknown as Message[];
      setMessages(reversed);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '無法載入訊息');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  /* ---------- fetch older messages (scroll up) ---------- */
  const fetchOlderMessages = useCallback(async () => {
    if (!conversationId || !hasMore || loadingOlder || !nextCursor) return;
    setLoadingOlder(true);
    try {
      const container = messagesContainerRef.current;
      const prevScrollHeight = container?.scrollHeight ?? 0;

      const data = await messagingApi.getMessages(conversationId, { cursor: nextCursor });
      const olderMessages = [...data.messages].reverse() as unknown as Message[];

      setMessages((prev) => [...olderMessages, ...prev]);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);

      // Restore scroll position after prepending
      requestAnimationFrame(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop += newScrollHeight - prevScrollHeight;
        }
      });
    } catch {
      // silent — don't block UI for pagination errors
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, hasMore, loadingOlder, nextCursor]);

  /* Initial load */
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  /* ---------- Load other user info + online status + block status ---------- */
  useEffect(() => {
    if (!conversationId || !user?.id) return;
    let cancelled = false;

    async function loadConvInfo() {
      try {
        const convs = (await messagingApi.getConversations()) as unknown as { id: string; participantIds: string[] }[];
        const conv = convs.find((c) => c.id === conversationId);
        if (!conv) return;
        const otherId = conv.participantIds.find((id) => id !== user?.id) ?? '';
        if (!otherId) return;

        const [profileResult, onlineResult, readResult, blockedResult, chatStatusResult] = await Promise.allSettled([
          usersApi.getProfile(otherId),
          messagingApi.getOnlineStatus([otherId]),
          messagingApi.getReadReceipts(conversationId!),
          usersApi.getBlockedUsers(),
          messagingApi.getChatStatus(conversationId!),
        ]);

        if (cancelled) return;

        if (profileResult.status === 'fulfilled') {
          setOtherUser({ id: otherId, displayName: profileResult.value.displayName, username: profileResult.value.username });
        } else {
          setOtherUser({ id: otherId });
        }

        if (onlineResult.status === 'fulfilled') {
          setOtherOnline(onlineResult.value[otherId] ?? false);
        }

        if (readResult.status === 'fulfilled') {
          setReadReceipts(readResult.value);
        }

        if (blockedResult.status === 'fulfilled') {
          const blockedUsers = blockedResult.value as unknown as { id: string }[];
          setIsBlocked(blockedUsers.some((u) => u.id === otherId));
        }

        // Proactively check diamond gate status
        if (chatStatusResult.status === 'fulfilled' && !chatStatusResult.value.canSend && chatStatusResult.value.gate) {
          const gate = chatStatusResult.value.gate;
          if (gate.type === 'DM_DIAMOND_GATE') {
            setDmUnlock({ message: gate.message, diamondCost: gate.diamondCost });
          } else if (gate.type === 'CHAT_DIAMOND_GATE') {
            setDiamondGate({ diamondCost: gate.diamondCost, threshold: gate.threshold ?? 0, sentCount: gate.sentCount ?? 0 });
          }
        }
      } catch {
        /* silent */
      }
    }

    loadConvInfo();
    return () => { cancelled = true; };
  }, [conversationId, user?.id]);

  /* ---------- Auto mark as read on new messages ---------- */
  useEffect(() => {
    if (!conversationId || !user?.id || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.senderId === user.id) return;
    // Mark as read
    messagingApi.markAsRead(conversationId, lastMsg.id).catch(() => { /* silent */ });
    const socket = getMessagingSocket();
    socket.emit('mark_read', { userId: user.id, conversationId, messageId: lastMsg.id });
  }, [messages, conversationId, user?.id]);

  /* ---------- WebSocket 連線 ---------- */
  useEffect(() => {
    if (!conversationId || !user?.id) return;

    const socket = getMessagingSocket();

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('join', { userId: user.id });

    function handleNewMessage(msg: Message) {
      if (msg.conversationId !== conversationId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    }

    function handleTyping(data: { userId: string; conversationId: string }) {
      if (data.conversationId !== conversationId) return;
      if (data.userId === user?.id) return;
      setOtherTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setOtherTyping(false), 3000);
    }

    function handleMessageRead(data: { userId: string; conversationId: string; messageId: string; readAt: string }) {
      if (data.conversationId !== conversationId) return;
      setReadReceipts((prev) => ({
        ...prev,
        [data.userId]: { messageId: data.messageId, readAt: data.readAt },
      }));
    }

    function handleUserOnline(data: { userId: string }) {
      if (data.userId === otherUser?.id) setOtherOnline(true);
    }

    function handleUserOffline(data: { userId: string }) {
      if (data.userId === otherUser?.id) setOtherOnline(false);
    }

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleTyping);
    socket.on('message_read', handleMessageRead);
    socket.on('user_online', handleUserOnline);
    socket.on('user_offline', handleUserOffline);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleTyping);
      socket.off('message_read', handleMessageRead);
      socket.off('user_online', handleUserOnline);
      socket.off('user_offline', handleUserOffline);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [conversationId, user?.id, otherUser?.id]);

  /* Track scroll position to determine if near bottom */
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    function handleScroll() {
      if (!container) return;
      const threshold = 100;
      isNearBottomRef.current =
        container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    }

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  /* Smart auto-scroll: only scroll to bottom when near bottom (not when loading older messages) */
  useEffect(() => {
    if (isNearBottomRef.current) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  /* IntersectionObserver for loading older messages */
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    const container = messagesContainerRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingOlder) {
          fetchOlderMessages();
        }
      },
      { root: container, rootMargin: '100px 0px 0px 0px', threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingOlder, fetchOlderMessages]);

  /* Close menu on click outside */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* ---------- send message via REST API (JWT auth) ---------- */
  async function handleSend() {
    const trimmed = input.trim();
    const hasImage = !!imagePreview;
    if ((!trimmed && !hasImage) || sending || !conversationId || !user?.id) return;

    setSending(true);

    let attachments: MessageAttachment[] | undefined;

    // Upload image first if present
    if (imagePreview) {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', imagePreview.file);
        const uploaded = await mediaApi.uploadSingle(formData);
        attachments = [{
          id: uploaded.id,
          type: 'image',
          url: uploaded.url,
          thumbnailUrl: uploaded.thumbnailUrl ?? undefined,
        }];
      } catch {
        setError('圖片上傳失敗');
        setSending(false);
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    // 樂觀更新：立即顯示在畫面
    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      conversationId,
      senderId: user.id,
      content: trimmed || (hasImage ? '[圖片]' : ''),
      attachments,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput('');
    setImagePreview(null);

    try {
      const saved = await messagingApi.sendMessage({
        conversationId,
        content: trimmed || ' ',
        attachments,
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...m, id: saved.id, createdAt: saved.createdAt }
            : m
        )
      );
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));

      if (err instanceof ApiError && err.statusCode === 402) {
        // [W-002] 門檻錯誤現在是正式 JSON 物件（也相容舊的 JSON 字串格式）
        let gateInfo: Record<string, unknown> | null = null;
        try {
          // 新格式：err.data 已是物件（GateErrorResponse）
          if (err.data && typeof err.data === 'object' && 'code' in err.data) {
            gateInfo = err.data as Record<string, unknown>;
            // 新格式的 metadata 展平到頂層以保持向後相容
            if (gateInfo.metadata && typeof gateInfo.metadata === 'object') {
              gateInfo = { ...gateInfo, ...(gateInfo.metadata as Record<string, unknown>) };
            }
          } else {
            // 舊格式回退：嘗試 JSON.parse
            gateInfo = JSON.parse(err.message);
          }
        } catch {
          // Not structured JSON — fall through to generic error
        }
        if (gateInfo) {
          if (gateInfo.code === 'CHAT_DIAMOND_GATE') {
            setDiamondGate({
              diamondCost: gateInfo.diamondCost as number,
              threshold: gateInfo.threshold as number,
              sentCount: gateInfo.sentCount as number,
            });
            setInput(trimmed);
            setSending(false);
            return;
          }
          if (gateInfo.code === 'DM_DIAMOND_GATE') {
            setDmUnlock({
              message: gateInfo.message as string,
              diamondCost: Math.ceil(gateInfo.diamondCost as number),
            });
            setInput(trimmed);
            setSending(false);
            return;
          }
        }
      }

      const msg = err instanceof ApiError ? err.message : '發送訊息失敗，請稍後再試';
      setError(msg);
      setInput(trimmed);
    } finally {
      setSending(false);
    }
  }

  /* ---------- typing indicator ---------- */
  function handleInputChange(value: string) {
    setInput(value);
    if (!conversationId || !user?.id) return;
    const socket = getMessagingSocket();
    socket.emit('typing', { userId: user.id, conversationId });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  /* ---------- image handling ---------- */
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setImagePreview({ file, url });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function clearImagePreview() {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview.url);
      setImagePreview(null);
    }
  }

  /* ---------- diamond gate unlock ---------- */
  async function handleUnlockChat() {
    if (!conversationId || unlocking) return;
    setUnlocking(true);
    try {
      await messagingApi.unlockChat(conversationId);
      setDiamondGate(null);
      handleSend();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : '解鎖失敗';
      setError(msg);
    } finally {
      setUnlocking(false);
    }
  }

  /* ---------- DM price unlock (paid DM access via diamonds) ---------- */
  async function handleDmPurchase() {
    if (!conversationId || unlocking) return;
    setUnlocking(true);
    try {
      await messagingApi.unlockDm(conversationId);
      setDmUnlock(null);
      handleSend();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : '解鎖失敗';
      setError(msg);
    } finally {
      setUnlocking(false);
    }
  }

  /* ---------- block / unblock ---------- */
  async function handleBlock() {
    if (!otherUser?.id || blockLoading) return;
    if (!confirm('確定要封鎖此用戶嗎？封鎖後將無法收發訊息。')) return;
    setBlockLoading(true);
    try {
      await usersApi.blockUser(otherUser.id);
      setIsBlocked(true);
      setShowMenu(false);
    } catch {
      setError('封鎖失敗');
    } finally {
      setBlockLoading(false);
    }
  }

  async function handleUnblock() {
    if (!otherUser?.id || blockLoading) return;
    setBlockLoading(true);
    try {
      await usersApi.unblockUser(otherUser.id);
      setIsBlocked(false);
      setShowMenu(false);
    } catch {
      setError('解除封鎖失敗');
    } finally {
      setBlockLoading(false);
    }
  }

  /* ---------- read receipt helper ---------- */
  function getReadStatus(msg: Message): 'read' | 'sent' | null {
    if (msg.senderId !== user?.id) return null;
    if (!otherUser?.id) return 'sent';
    const receipt = readReceipts[otherUser.id];
    if (!receipt) return 'sent';
    // Check if the other user has read up to or past this message
    // Simple: if the receipt messageId matches or msg was sent before the receipt
    if (receipt.messageId === msg.id) return 'read';
    // Check by position in messages array
    const msgIndex = messages.findIndex((m) => m.id === msg.id);
    const receiptIndex = messages.findIndex((m) => m.id === receipt.messageId);
    if (receiptIndex >= msgIndex) return 'read';
    return 'sent';
  }

  /* ---------- render ---------- */
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] flex-col">
        <div className="flex items-center gap-3 border-b bg-white p-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex-1 space-y-4 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              <Skeleton className="h-10 w-48 rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <p className="text-sm text-red-500">{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          返回
        </Button>
      </div>
    );
  }

  const inputDisabled = sending || !!diamondGate || !!dmUnlock || isBlocked || uploading;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col md:h-[calc(100vh-4rem)]">
      {/* ---- Header ---- */}
      <div className="flex items-center gap-3 border-b bg-white px-4 py-3">
        <button
          onClick={() => router.push('/messages')}
          className="rounded-full p-1 transition-colors hover:bg-gray-100"
          aria-label="返回對話列表"
        >
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>
        {/* Avatar — click to profile */}
        <button
          onClick={() => otherUser?.id && router.push(`/user/${otherUser.id}`)}
          className="relative shrink-0 rounded-full transition-opacity hover:opacity-80"
          aria-label={`查看 ${otherUser?.displayName || '使用者'} 的個人資訊`}
        >
          <Avatar
            fallback={(otherUser?.displayName || '?').slice(0, 2).toUpperCase()}
            size="sm"
          />
          {otherOnline && (
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <button
            onClick={() => otherUser?.id && router.push(`/user/${otherUser.id}`)}
            className="text-left hover:underline"
          >
            <h1 className="text-base font-semibold text-gray-900 truncate">
              {otherUser?.displayName || '對話'}
            </h1>
          </button>
          <p className="text-xs text-gray-500">
            {otherOnline ? (
              <span className="text-green-600 font-medium">在線</span>
            ) : (
              '離線'
            )}
          </p>
        </div>

        {/* More menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded-full p-1.5 transition-colors hover:bg-gray-100"
            aria-label="更多操作"
          >
            <MoreVertical className="h-5 w-5 text-gray-600" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border bg-white py-1 shadow-lg z-50">
              {isBlocked ? (
                <button
                  onClick={handleUnblock}
                  disabled={blockLoading}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-green-700 hover:bg-gray-50"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {blockLoading ? '處理中...' : '解除封鎖'}
                </button>
              ) : (
                <button
                  onClick={handleBlock}
                  disabled={blockLoading}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                >
                  <ShieldBan className="h-4 w-4" />
                  {blockLoading ? '處理中...' : '封鎖用戶'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ---- Blocked banner ---- */}
      {isBlocked && (
        <div className="flex items-center gap-2 border-b bg-red-50 px-4 py-2">
          <ShieldBan className="h-4 w-4 text-red-500" />
          <span className="text-sm text-red-700">你已封鎖此用戶，無法收發訊息</span>
          <button
            onClick={handleUnblock}
            disabled={blockLoading}
            className="ml-auto text-xs font-medium text-red-600 hover:underline"
          >
            解除封鎖
          </button>
        </div>
      )}

      {/* ---- Messages ---- */}
      <div
        ref={messagesContainerRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
      >
        {/* Top sentinel for infinite scroll */}
        <div ref={topSentinelRef} className="h-px" />

        {/* Loading older messages spinner */}
        {loadingOlder && (
          <div className="flex justify-center py-2">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        )}

        {/* Beginning of conversation marker */}
        {!hasMore && messages.length > 0 && (
          <p className="py-2 text-center text-xs text-gray-400">
            — 對話開始 —
          </p>
        )}

        {messages.length === 0 && !loadingOlder && (
          <p className="py-8 text-center text-sm text-gray-400">
            還沒有訊息，開始聊天吧！
          </p>
        )}

        {messages.map((msg) => {
          const isOwn = msg.senderId === user?.id;
          const readStatus = getReadStatus(msg);
          return (
            <div
              key={msg.id}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div className="max-w-[75%]">
                {/* Image attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mb-1">
                    {msg.attachments.filter((a) => a.type === 'image').map((att) => (
                      <button
                        key={att.id}
                        onClick={() => setFullscreenImage(att.url)}
                        className="block overflow-hidden rounded-2xl"
                      >
                        <img
                          src={att.thumbnailUrl || att.url}
                          alt="附件圖片"
                          className="max-h-60 max-w-full rounded-2xl object-cover"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {/* Text bubble */}
                {msg.content && msg.content.trim() && (
                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      isOwn
                        ? 'bg-neutral-900 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  </div>
                )}

                {/* Timestamp + read status */}
                <div className={`mt-0.5 flex items-center gap-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-[10px] text-gray-400">
                    {timeAgo(msg.createdAt)}
                  </span>
                  {isOwn && readStatus === 'read' && (
                    <CheckCheck className="h-3 w-3 text-blue-500" />
                  )}
                  {isOwn && readStatus === 'sent' && (
                    <Check className="h-3 w-3 text-gray-400" />
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {otherTyping && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl bg-gray-100 px-4 py-2">
              <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0ms' }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '150ms' }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ---- Fullscreen image overlay ---- */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setFullscreenImage(null)}
        >
          <button
            className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/40"
            onClick={() => setFullscreenImage(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={fullscreenImage}
            alt="放大圖片"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
          />
        </div>
      )}

      {/* ---- Diamond Gate Modal ---- */}
      {diamondGate && (
        <div className="border-t bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <Diamond className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-900">
                已達免費訊息上限
              </p>
              <p className="text-xs text-amber-700">
                已發送 {diamondGate.sentCount}/{diamondGate.threshold} 則免費訊息
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleUnlockChat}
              disabled={unlocking}
              className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {unlocking ? (
                '解鎖中...'
              ) : (
                <>
                  <Diamond className="mr-1 h-3 w-3" />
                  {diamondGate.diamondCost} 鑽石解鎖
                </>
              )}
            </Button>
          </div>
          <button
            onClick={() => setDiamondGate(null)}
            className="mt-1 text-xs text-amber-600 hover:underline"
          >
            稍後再說
          </button>
        </div>
      )}

      {/* ---- DM Purchase Gate ---- */}
      {dmUnlock && (
        <div className="border-t bg-purple-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100">
              <Diamond className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-purple-900">
                需要購買 DM 權限
              </p>
              <p className="text-xs text-purple-700">
                此創作者需要 {dmUnlock.diamondCost} 鑽石解鎖私訊功能
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleDmPurchase}
              disabled={unlocking}
              className="shrink-0 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {unlocking ? (
                '購買中...'
              ) : (
                <>
                  <Diamond className="mr-1 h-3 w-3" />
                  {dmUnlock.diamondCost} 鑽石購買
                </>
              )}
            </Button>
          </div>
          <button
            onClick={() => setDmUnlock(null)}
            className="mt-1 text-xs text-purple-600 hover:underline"
          >
            稍後再說
          </button>
        </div>
      )}

      {/* ---- Image preview ---- */}
      {imagePreview && (
        <div className="border-t bg-gray-50 px-4 py-2">
          <div className="relative inline-block">
            <img
              src={imagePreview.url}
              alt="預覽"
              className="h-20 w-20 rounded-lg object-cover"
            />
            <button
              onClick={clearImagePreview}
              className="absolute -right-1.5 -top-1.5 rounded-full bg-gray-700 p-0.5 text-white hover:bg-gray-900"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* ---- Input bar ---- */}
      <div className="border-t bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          {/* Image upload button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={inputDisabled}
            className="shrink-0 rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
            aria-label="上傳圖片"
          >
            <ImageIcon className="h-5 w-5" />
          </button>

          <Input
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isBlocked ? '已封鎖，無法傳送訊息' : '輸入訊息...'}
            className="flex-1 rounded-full"
            disabled={inputDisabled}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={(!input.trim() && !imagePreview) || inputDisabled}
            className="shrink-0 rounded-full bg-neutral-900 hover:bg-neutral-800"
            aria-label="傳送訊息"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
