'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../providers/auth-provider';
import { useToast } from '../../../providers/toast-provider';
import { contentApi, usersApi, ApiError } from '../../../lib/api';
import { timeAgo } from '../../../lib/utils';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  Skeleton,
  EmptyState,
  Tooltip,
  cn,
  getFriendlyErrorMessage,
} from '@suggar-daddy/ui';
import {
  Heart,
  DollarSign,
  Plus,
  Lock,
  Sparkles,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { StoriesBar } from '../../../components/stories/stories-bar';
import { StoryViewer } from '../../../components/stories/story-viewer';
import type { StoryGroup } from '@suggar-daddy/api-client';

interface Post {
  id: string;
  authorId: string;
  content: string;
  mediaUrls?: string[];
  isPremium: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FeedState {
  posts: Post[];
  nextCursor?: string;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
}

function PostCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </CardContent>
      <CardFooter className="gap-4">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
      </CardFooter>
    </Card>
  );
}

function PremiumOverlay({ postId }: { postId: string }) {
  const router = useRouter();

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-white/80 backdrop-blur-sm">
      <div className="mb-3 rounded-full bg-brand-50 p-3">
        <Lock className="h-6 w-6 text-brand-500" />
      </div>
      <p className="mb-3 text-sm font-medium text-gray-700">
        此為付費內容
      </p>
      <Button
        size="sm"
        className="bg-brand-500 hover:bg-brand-600 text-white"
        onClick={() => router.push(`/post/${postId}`)}
      >
        解鎖此內容
      </Button>
    </div>
  );
}

interface PostCardProps {
  post: Post;
  currentUserId?: string;
  onLikeToggle: (postId: string) => void;
  likedPosts: Set<string>;
  authorName?: string;
}

function PostCard({ post, currentUserId, onLikeToggle, likedPosts, authorName }: PostCardProps) {
  const isOwner = currentUserId === post.authorId;
  const isLocked = post.isPremium && !isOwner;
  const isLiked = likedPosts.has(post.id);
  const displayName = authorName || post.authorId.slice(0, 8);
  const authorInitials = displayName.slice(0, 2).toUpperCase();

  return (
    <Card className="relative overflow-hidden">
      {isLocked && <PremiumOverlay postId={post.id} />}

      <CardContent className="pt-4">
        {/* Author row */}
        <div className="flex items-center gap-3">
          <Avatar fallback={authorInitials} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link
                href={`/user/${post.authorId}`}
                className="text-sm font-semibold text-gray-900 truncate hover:underline"
              >
                {displayName}
              </Link>
              {post.isPremium && (
                <Badge
                  variant="warning"
                  className="bg-brand-100 text-brand-700 border-brand-200"
                >
                  <Lock className="mr-1 h-3 w-3" />
                  付費
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-500">{timeAgo(post.createdAt)}</p>
          </div>
        </div>

        {/* Content */}
        <div className={cn('mt-3', isLocked && 'blur-sm select-none')}>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
            {post.content}
          </p>

          {/* Media thumbnails */}
          {post.mediaUrls && post.mediaUrls.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {post.mediaUrls.slice(0, 4).map((url, idx) => (
                <div
                  key={idx}
                  className="relative aspect-square overflow-hidden rounded-lg bg-gray-100"
                >
                  <img
                    src={url}
                    alt={`Media ${idx + 1}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  {idx === 3 && post.mediaUrls && post.mediaUrls.length > 4 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white font-bold text-lg">
                      +{post.mediaUrls.length - 4}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {/* Actions */}
      <CardFooter className="gap-2 border-t px-4 py-2">
        <Tooltip content={isLiked ? '取消喜歡' : '喜歡此貼文'}>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'gap-1.5 text-gray-500',
              isLiked && 'text-red-500 hover:text-red-600'
            )}
            onClick={() => onLikeToggle(post.id)}
          >
            <Heart
              className={cn('h-4 w-4', isLiked && 'fill-current')}
            />
            <span className="text-xs">
              {isLiked ? '已喜歡' : '喜歡'}
            </span>
          </Button>
        </Tooltip>

        <Link href={`/post/${post.id}`}>
          <Tooltip content="打賞創作者">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-gray-500"
            >
              <DollarSign className="h-4 w-4" />
              <span className="text-xs">打賞</span>
            </Button>
          </Tooltip>
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function FeedPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [state, setState] = useState<FeedState>({
    posts: [],
    nextCursor: undefined,
    isLoading: true,
    isLoadingMore: false,
    error: null,
  });
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [authorNames, setAuthorNames] = useState<Record<string, string>>({});
  const [storyViewerData, setStoryViewerData] = useState<{
    groups: StoryGroup[];
    startIndex: number;
  } | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const handleStoryClick = (groups: StoryGroup[], startIndex: number) => {
    setStoryViewerData({ groups, startIndex });
  };

  const fetchPosts = useCallback(async (cursor?: string) => {
    try {
      const result = await contentApi.getPosts(cursor);
      setState((prev) => ({
        ...prev,
        posts: cursor ? [...prev.posts, ...result.posts] : result.posts,
        nextCursor: result.nextCursor,
        isLoading: false,
        isLoadingMore: false,
        error: null,
      }));
      setRetryCount(0); // 重置重試計數
    } catch (err) {
      const friendlyMessage = getFriendlyErrorMessage(err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isLoadingMore: false,
        error: friendlyMessage,
      }));
      
      // 顯示 toast 通知
      toast.error(friendlyMessage);
    }
  }, [toast]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    const unknownIds = state.posts
      .map((p) => p.authorId)
      .filter((id) => !authorNames[id]);
    const uniqueIds = [...new Set(unknownIds)];
    if (uniqueIds.length === 0) return;

    Promise.all(
      uniqueIds.map(async (id) => {
        try {
          const profile = await usersApi.getProfile(id);
          return [id, profile.displayName] as const;
        } catch {
          return [id, id.slice(0, 8)] as const;
        }
      })
    ).then((entries) => {
      setAuthorNames((prev) => {
        const next = { ...prev };
        for (const [id, name] of entries) next[id] = name;
        return next;
      });
    });
  }, [state.posts]);

  const handleLoadMore = () => {
    if (!state.nextCursor || state.isLoadingMore) return;
    setState((prev) => ({ ...prev, isLoadingMore: true }));
    fetchPosts(state.nextCursor);
  };

  const handleLikeToggle = async (postId: string) => {
    const isCurrentlyLiked = likedPosts.has(postId);

    // Optimistic update
    setLikedPosts((prev) => {
      const next = new Set(prev);
      if (isCurrentlyLiked) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });

    try {
      if (isCurrentlyLiked) {
        await contentApi.unlikePost(postId);
      } else {
        await contentApi.likePost(postId);
        toast.success('已喜歡此貼文');
      }
    } catch (err) {
      // Revert on failure
      setLikedPosts((prev) => {
        const next = new Set(prev);
        if (isCurrentlyLiked) {
          next.add(postId);
        } else {
          next.delete(postId);
        }
        return next;
      });
      
      // 顯示錯誤提示
      const friendlyMessage = getFriendlyErrorMessage(err);
      toast.error(friendlyMessage);
    }
  };

  const handleRefresh = () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    setRetryCount(0);
    fetchPosts();
  };

  return (
    <div className="space-y-4">
      {/* Story viewer overlay */}
      {storyViewerData && (
        <StoryViewer
          groups={storyViewerData.groups}
          startGroupIndex={storyViewerData.startIndex}
          onClose={() => setStoryViewerData(null)}
        />
      )}

      {/* Stories bar */}
      <StoriesBar onStoryClick={handleStoryClick} />

      {/* Welcome card */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 p-5 text-white">
        <h1 className="text-xl font-bold">
          {user?.displayName ? `嗨，${user.displayName}` : '歡迎'}
        </h1>
        <p className="mt-1 text-sm text-brand-100">
          {(user as any)?.userType === 'sugar_baby'
            ? '開始分享你的精彩內容吧'
            : '探索你感興趣的創作者'}
        </p>
      </div>

      {/* Error state */}
      {state.error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800 mb-1">載入動態時發生錯誤</p>
                <p className="text-sm text-red-600">{state.error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  className="mt-3 text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                >
                  <RefreshCw className="mr-1 h-4 w-4" aria-hidden="true" />
                  重試
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading skeletons */}
      {state.isLoading && (
        <div className="space-y-4" role="status" aria-live="polite" aria-label="載入動態中">
          <span className="sr-only">載入中，請稍候...</span>
          <PostCardSkeleton />
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      )}

      {/* Post list */}
      {!state.isLoading && !state.error && state.posts.length > 0 && (
        <div className="space-y-4">
          {state.posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={user?.id}
              onLikeToggle={handleLikeToggle}
              likedPosts={likedPosts}
              authorName={authorNames[post.authorId]}
            />
          ))}

          {/* Load more */}
          {state.nextCursor && (
            <div className="flex justify-center py-4">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={state.isLoadingMore}
                className="w-full max-w-xs"
              >
                {state.isLoadingMore ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    載入中...
                  </>
                ) : (
                  '載入更多'
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!state.isLoading && !state.error && state.posts.length === 0 && (
        <EmptyState
          icon={Sparkles}
          title="還沒有任何動態"
          description="目前還沒有人發布內容。成為第一個分享精彩動態的人吧！"
          action={
            <Link href="/post/create">
              <Button className="bg-brand-500 hover:bg-brand-600 text-white">
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                發布動態
              </Button>
            </Link>
          }
        />
      )}

      {/* FAB - mobile create post button */}
      <Link
        href="/post/create"
        className="fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg transition-transform hover:bg-brand-600 hover:scale-105 active:scale-95 md:bottom-8 md:right-8"
        aria-label="發布新動態"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}
