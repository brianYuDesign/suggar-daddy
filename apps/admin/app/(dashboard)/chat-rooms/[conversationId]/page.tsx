'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { usePermissions, AdminPermission } from '@/lib/permissions';
import { Pagination } from '@/components/pagination';
import { Card, CardHeader, CardTitle, CardContent, Avatar, Skeleton, Badge } from '@suggar-daddy/ui';

export default function ConversationDetailPage() {
  const { t } = useTranslation('chat');
  const { requirePermission } = usePermissions();
  requirePermission(AdminPermission.VIEW_CHAT_ROOMS);

  const params = useParams();
  const conversationId = params.conversationId as string;
  const [page, setPage] = useState(1);
  const limit = 50;

  const { data, loading } = useAdminQuery(
    () => adminApi.getConversationMessages(conversationId, page, limit),
    [conversationId, page],
  );

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/chat-rooms" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; {t('backToChatRooms')}
        </Link>
      </div>

      {/* Participants */}
      {data?.conversation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('participants')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {data.conversation.participants?.map((p) => (
                <Link
                  key={p.id}
                  href={`/users/${p.id}`}
                  className="flex items-center gap-3 rounded-md p-2 hover:bg-muted transition-colors"
                >
                  <Avatar
                    src={p.avatarUrl}
                    fallback={p.displayName || p.email}
                    size="sm"
                  />
                  <div>
                    <p className="text-sm font-medium">{p.displayName || t('unknown')}</p>
                    <p className="text-xs text-muted-foreground">{p.email}</p>
                  </div>
                  {p.permissionRole && (
                    <Badge variant="secondary" className="text-xs">
                      {p.permissionRole}
                    </Badge>
                  )}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Messages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('messages')} {data && <span className="font-normal text-muted-foreground">({data.total} total)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : data?.messages?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('noMessages')}
            </div>
          ) : (
            <div className="space-y-4">
              {data?.messages?.map((msg) => (
                <div key={msg.id} className="flex gap-3 rounded-md p-3 hover:bg-muted/30">
                  <Avatar
                    src={msg.sender?.avatarUrl}
                    fallback={msg.sender?.displayName || t('unknown')}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {msg.sender?.displayName || t('unknown')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm mt-1 whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                    {msg.attachments?.length > 0 && (
                      <div className="mt-2 flex gap-2">
                        {msg.attachments.map((att) => (
                          <Badge key={att.id} variant="outline" className="text-xs">
                            {att.type}: {att.url}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
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
