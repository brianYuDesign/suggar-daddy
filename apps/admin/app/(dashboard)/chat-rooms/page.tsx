'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { usePermissions, AdminPermission } from '@/lib/permissions';
import { Pagination } from '@/components/pagination';
import { Card, CardHeader, CardTitle, CardContent, Badge, Avatar, Skeleton, Input } from '@suggar-daddy/ui';

export default function ChatRoomsPage() {
  const { t } = useTranslation('chat');
  const { requirePermission } = usePermissions();
  requirePermission(AdminPermission.VIEW_CHAT_ROOMS);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const limit = 20;

  const { data: stats, loading: statsLoading } = useAdminQuery(
    () => adminApi.getChatStats(),
    [],
  );

  const { data, loading } = useAdminQuery(
    () => adminApi.listConversations(page, limit, search || undefined),
    [page, search],
  );

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Badge variant="secondary">{t('superAdminOnly')}</Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.totalConversations ?? 0}
            </div>
            <p className="text-sm text-muted-foreground">{t('stats.totalConversations')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.totalMessages ?? 0}
            </div>
            <p className="text-sm text-muted-foreground">{t('stats.totalMessages')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.onlineUsers ?? 0}
            </div>
            <p className="text-sm text-muted-foreground">{t('stats.onlineUsers')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder={t('searchPlaceholder')}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="w-80"
        />
      </div>

      {/* Conversations List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('conversations')} {data && <span className="font-normal text-muted-foreground">({data.total} total)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : data?.data?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('noConversations')}
            </div>
          ) : (
            <div className="divide-y">
              {data?.data?.map((conv) => (
                <Link
                  key={conv.id}
                  href={`/chat-rooms/${conv.id}`}
                  className="flex items-center gap-4 py-4 px-2 hover:bg-muted/50 rounded-md transition-colors"
                >
                  <div className="flex -space-x-2">
                    {conv.participants?.slice(0, 2).map((p) => (
                      <Avatar
                        key={p.id}
                        src={p.avatarUrl}
                        fallback={p.displayName || p.email}
                        size="sm"
                      />
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {conv.participants?.map((p) => p.displayName || p.email).join(' & ')}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      ID: {conv.id}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {conv.lastMessageAt
                      ? new Date(conv.lastMessageAt).toLocaleString()
                      : t('noMessages')}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-4 flex justify-center">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
