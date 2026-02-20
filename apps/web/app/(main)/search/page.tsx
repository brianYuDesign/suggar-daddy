'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  Skeleton,
  cn,
} from '@suggar-daddy/ui';
import {
  Search,
  X,
  Users,
  FileText,
  Heart,
  DollarSign,
  Lock,
  TrendingUp,
} from 'lucide-react';
import { usersApi, contentApi, ApiError, UserCard } from '../../../lib/api';
import { timeAgo } from '../../../lib/utils';
import { FollowButton } from '../../../components/FollowButton';
import { useAuth } from '../../../providers/auth-provider';

interface Post {
  id: string;
  authorId: string;
  content: string;
  mediaUrls?: string[];
  isPremium: boolean;
  createdAt: string;
}

type TabType = 'users' | 'posts';

function SearchSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-9 w-20 rounded-md" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function UserResultCard({
  user,
  currentUserId,
  isFollowing,
}: {
  user: UserCard;
  currentUserId?: string;
  isFollowing?: boolean;
}) {
  const initials = (user.displayName || user.username || 'U').slice(0, 2).toUpperCase();
  const isOwnProfile = currentUserId === user.userId;

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center gap-3">
          <Link href={`/user/${user.userId}`}>
            <Avatar
              src={user.avatarUrl}
              fallback={initials}
              size="md"
              className="h-12 w-12"
            />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link
                href={`/user/${user.userId}`}
                className="text-sm font-semibold text-gray-900 truncate hover:underline"
              >
                {user.displayName || user.username}
              </Link>
              {user.isVerified && (
                <Badge variant="success" className="text-[10px] px-1.5 py-0">
                  已認證
                </Badge>
              )}
            </div>
            {user.bio && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                {user.bio}
              </p>
            )}
          </div>
          {!isOwnProfile && user.userId && (
            <FollowButton
              targetUserId={user.userId}
              initialIsFollowing={isFollowing}
              size="sm"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PostResultCard({ post }: { post: Post }) {
  const isLocked = post.isPremium;

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="pt-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar fallback={post.authorId.slice(0, 2).toUpperCase()} size="md" />
          <div className="flex-1 min-w-0">
            <Link
              href={`/user/${post.authorId}`}
              className="text-sm font-semibold text-gray-900 hover:underline"
            >
              {post.authorId.slice(0, 8)}
            </Link>
            <p className="text-xs text-gray-500">{timeAgo(post.createdAt)}</p>
          </div>
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
        <div className={cn(isLocked && 'blur-sm select-none')}>
          <p className="text-sm text-gray-800 leading-relaxed line-clamp-3 whitespace-pre-wrap">
            {post.content}
          </p>
        </div>
      </CardContent>
      <CardFooter className="gap-2 border-t px-4 py-2">
        <Link href={`/post/${post.id}`}>
          <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500">
            <Heart className="h-4 w-4" />
            <span className="text-xs">喜歡</span>
          </Button>
        </Link>
        <Link href={`/post/${post.id}`}>
          <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500">
            <DollarSign className="h-4 w-4" />
            <span className="text-xs">打賞</span>
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function SearchPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [isSearching, setIsSearching] = useState(false);

  const [userResults, setUserResults] = useState<UserCard[]>([]);
  const [postResults, setPostResults] = useState<Post[]>([]);
  const [recommendedCreators, setRecommendedCreators] = useState<UserCard[]>([]);
  const [loadingRecommended, setLoadingRecommended] = useState(true);
  const [followStatusMap, setFollowStatusMap] = useState<Record<string, boolean>>({});

  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Batch fetch follow statuses, returns the map (doesn't depend on existing state)
  const batchFetchFollowStatuses = useCallback(
    async (userIds: string[]): Promise<Record<string, boolean>> => {
      if (!user?.id) return {};
      const idsToCheck = userIds.filter((id) => id !== user.id);
      if (idsToCheck.length === 0) return {};
      const results = await Promise.allSettled(
        idsToCheck.map((id) => usersApi.getFollowStatus(id))
      );
      const map: Record<string, boolean> = {};
      idsToCheck.forEach((id, i) => {
        const r = results[i];
        map[id] = r.status === 'fulfilled' ? r.value.isFollowing : false;
      });
      return map;
    },
    [user?.id]
  );

  // Load recommended creators on mount
  useEffect(() => {
    (async () => {
      try {
        const creators = await usersApi.getRecommendedCreators(10);
        // Fetch follow statuses BEFORE showing results (no flash)
        const ids = creators.map((c: any) => c.userId).filter(Boolean);
        const statuses = await batchFetchFollowStatuses(ids);
        setFollowStatusMap((prev) => ({ ...prev, ...statuses }));
        setRecommendedCreators(creators as any);
      } catch {
        // Silently fail
      } finally {
        setLoadingRecommended(false);
      }
    })();
  }, [user?.id, batchFetchFollowStatuses]);

  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setUserResults([]);
        setPostResults([]);
        setHasSearched(false);
        return;
      }

      setIsSearching(true);
      setHasSearched(true);

      try {
        if (activeTab === 'users') {
          const users = await usersApi.searchUsers(searchQuery);
          // Fetch follow statuses BEFORE showing results (no flash)
          const statuses = await batchFetchFollowStatuses(users.map((u) => u.userId));
          setFollowStatusMap((prev) => ({ ...prev, ...statuses }));
          setUserResults(users);
        } else {
          const result = await contentApi.searchPosts(searchQuery);
          setPostResults(result.data);
        }
      } catch (err) {
        console.error(
          'Search failed:',
          ApiError.getMessage(err, 'Search failed')
        );
      } finally {
        setIsSearching(false);
      }
    },
    [activeTab, batchFetchFollowStatuses]
  );

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, performSearch]);

  // Re-search when tab changes
  useEffect(() => {
    if (query.trim()) {
      performSearch(query);
    }
  }, [activeTab]);

  const handleClear = () => {
    setQuery('');
    setUserResults([]);
    setPostResults([]);
    setHasSearched(false);
  };

  const showRecommended = !query.trim() && !hasSearched;

  return (
    <div className="space-y-4">
      {/* Search header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 mb-4">搜尋</h1>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋用戶或貼文..."
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-10 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            autoFocus
          />
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 hover:text-gray-600"
              aria-label="清除搜尋"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        <button
          onClick={() => setActiveTab('users')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            activeTab === 'users'
              ? 'bg-white text-brand-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <Users className="h-4 w-4" />
          用戶
        </button>
        <button
          onClick={() => setActiveTab('posts')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            activeTab === 'posts'
              ? 'bg-white text-brand-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <FileText className="h-4 w-4" />
          貼文
        </button>
      </div>

      {/* Loading */}
      {isSearching && <SearchSkeleton />}

      {/* User results */}
      {!isSearching && activeTab === 'users' && hasSearched && (
        <div className="space-y-3">
          {userResults.length > 0 ? (
            userResults.map((u) => (
              <UserResultCard
                key={u.userId}
                user={u}
                currentUserId={user?.id}
                isFollowing={followStatusMap[u.userId]}
              />
            ))
          ) : (
            <div className="flex flex-col items-center py-12 text-center">
              <Users className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">
                找不到符合「{query}」的用戶
              </p>
            </div>
          )}
        </div>
      )}

      {/* Post results */}
      {!isSearching && activeTab === 'posts' && hasSearched && (
        <div className="space-y-3">
          {postResults.length > 0 ? (
            postResults.map((p) => <PostResultCard key={p.id} post={p} />)
          ) : (
            <div className="flex flex-col items-center py-12 text-center">
              <FileText className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">
                找不到符合「{query}」的貼文
              </p>
            </div>
          )}
        </div>
      )}

      {/* Recommended creators (when no search) */}
      {showRecommended && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-brand-500" />
            <h2 className="text-sm font-semibold text-gray-700">熱門創作者</h2>
          </div>

          {loadingRecommended ? (
            <SearchSkeleton />
          ) : recommendedCreators.length > 0 ? (
            <div className="space-y-3">
              {recommendedCreators.map((creator) => (
                <UserResultCard
                  key={creator.userId}
                  user={creator}
                  currentUserId={user?.id}
                  isFollowing={followStatusMap[creator.userId]}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-12 text-center">
              <Users className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">暫無推薦創作者</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
