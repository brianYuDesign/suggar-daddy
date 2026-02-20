'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send } from 'lucide-react';
import { Button, Input, Skeleton } from '@suggar-daddy/ui';
import { messagingApi, ApiError } from '../../../../lib/api';
import { getMessagingSocket } from '../../../../lib/socket';
import { useAuth } from '../../../../providers/auth-provider';
import { timeAgo } from '../../../../lib/utils';

/* ------------------------------------------------------------------ */
/*  Local types                                                        */
/* ------------------------------------------------------------------ */
interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: Date;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function ChatRoomPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---------- scroll helper ---------- */
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  /* ---------- fetch initial messages via REST ---------- */
  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      const data = await messagingApi.getMessages(conversationId);
      setMessages(data as unknown as Message[]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '無法載入訊息');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  /* Initial load */
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  /* ---------- WebSocket 連線 ---------- */
  useEffect(() => {
    if (!conversationId || !user?.id) return;

    const socket = getMessagingSocket();

    if (!socket.connected) {
      socket.connect();
    }

    // 加入用戶房間 & 對話房間
    socket.emit('join', { userId: user.id });

    // 收到即時新訊息
    function handleNewMessage(msg: Message) {
      if (msg.conversationId !== conversationId) return;
      setMessages((prev) => {
        // 防止重複（自己送出的訊息可能已經樂觀添加）
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    }

    // 對方輸入中
    function handleTyping(data: { userId: string; conversationId: string }) {
      if (data.conversationId !== conversationId) return;
      if (data.userId === user?.id) return;
      setOtherTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setOtherTyping(false), 3000);
    }

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleTyping);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleTyping);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [conversationId, user?.id]);

  /* Auto-scroll on new messages */
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  /* ---------- send message via REST API (JWT auth) ---------- */
  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || sending || !conversationId || !user?.id) return;

    setSending(true);

    // 樂觀更新：立即顯示在畫面
    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      conversationId,
      senderId: user.id,
      content: trimmed,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput('');

    try {
      // 透過 REST API 發送（使用 JWT 認證，比 WebSocket 更可靠）
      const saved = await messagingApi.sendMessage({
        conversationId,
        content: trimmed,
      });
      // 替換樂觀訊息為伺服器回傳的實際訊息
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...m, id: saved.id, createdAt: saved.createdAt }
            : m
        )
      );
    } catch (err) {
      // 發送失敗：移除樂觀訊息
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      const msg = err instanceof ApiError ? err.message : '發送訊息失敗，請稍後再試';
      setError(msg);
      setInput(trimmed); // 恢復輸入
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
        <h1 className="text-base font-semibold text-gray-900">對話</h1>
      </div>

      {/* ---- Messages ---- */}
      <div
        ref={messagesContainerRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">
            還沒有訊息，開始聊天吧！
          </p>
        )}

        {messages.map((msg) => {
          const isOwn = msg.senderId === user?.id;
          return (
            <div
              key={msg.id}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                  isOwn
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm leading-relaxed">{msg.content}</p>
                <p
                  className={`mt-1 text-right text-[10px] ${
                    isOwn ? 'text-brand-100' : 'text-gray-400'
                  }`}
                >
                  {timeAgo(msg.createdAt)}
                </p>
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

      {/* ---- Input bar ---- */}
      <div className="border-t bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="輸入訊息..."
            className="flex-1 rounded-full"
            disabled={sending}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="shrink-0 rounded-full bg-brand-500 hover:bg-brand-600"
            aria-label="傳送訊息"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
