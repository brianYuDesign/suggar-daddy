'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { FileText, Send, FileEdit, MoreHorizontal, Plus } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { useSort } from '@/lib/use-sort';
import { useToast } from '@/components/toast';
import { StatsCard } from '@/components/stats-card';
import { SortableTableHead } from '@/components/sortable-table-head';
import { Pagination } from '@/components/pagination';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Select,
  Skeleton,
  Input,
  Button,
  ConfirmDialog,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@suggar-daddy/ui';

interface PageItem {
  id: string;
  title: string;
  slug: string;
  pageType: string;
  status: string;
  updatedAt: string;
  publishedAt: string | null;
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  published: 'default',
  draft: 'secondary',
  archived: 'outline',
};

const PAGE_TYPES = [
  'privacy', 'terms', 'community-guidelines', 'about',
  'contact', 'faq', 'cookie-policy', 'custom',
];

export default function PagesListPage() {
  const { t } = useTranslation('pages');
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [pageType, setPageType] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const limit = 20;

  const { data: stats, loading: statsLoading } = useAdminQuery(
    () => adminApi.getPageStats(),
    [],
  );

  const { data, loading, refetch } = useAdminQuery(
    () => adminApi.listPages(page, limit, pageType || undefined, status || undefined, search || undefined),
    [page, pageType, status, search],
  );

  const { sorted, sort, toggleSort } = useSort(data?.items as PageItem[] | undefined, 'updatedAt');

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleSingleAction = async (id: string, action: 'publish' | 'archive' | 'delete') => {
    setActionMenuId(null);
    try {
      if (action === 'publish') {
        await adminApi.publishPage(id);
        toast.success(t('editor.saveSuccess'));
      } else if (action === 'archive') {
        await adminApi.archivePage(id);
        toast.success(t('editor.saveSuccess'));
      } else if (action === 'delete') {
        await adminApi.deletePage(id);
        toast.success(t('editor.deleteSuccess'));
      }
      refetch();
    } catch {
      toast.error(t('editor.saveFailed'));
    }
  };

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('subtitle')}</p>
        </div>
        <Link href="/content/pages/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t('createNew')}
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))
        ) : (
          <>
            <StatsCard title={t('stats.total')} value={stats?.total ?? 0} icon={FileText} />
            <StatsCard title={t('stats.published')} value={stats?.published ?? 0} icon={Send} />
            <StatsCard title={t('stats.draft')} value={stats?.draft ?? 0} icon={FileEdit} />
            <StatsCard title={t('stats.archived')} value={stats?.archived ?? 0} icon={FileText} />
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex gap-2">
          <Input
            placeholder={t('filters.searchPlaceholder')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-64"
          />
        </div>
        <Select value={pageType} onChange={(e) => { setPageType(e.target.value); setPage(1); }} className="w-40">
          <option value="">{t('filters.allTypes')}</option>
          {PAGE_TYPES.map((pt) => (
            <option key={pt} value={pt}>{t(`pageType.${pt}`)}</option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-40">
          <option value="">{t('filters.allStatus')}</option>
          <option value="draft">{t('status.draft')}</option>
          <option value="published">{t('status.published')}</option>
          <option value="archived">{t('status.archived')}</option>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('table.pageList')} {data && <span className="font-normal text-muted-foreground">({data.total})</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead label={t('table.title')} sortKey="title" sort={sort} onToggle={toggleSort} />
                      <TableHead>{t('table.slug')}</TableHead>
                      <TableHead>{t('table.pageType')}</TableHead>
                      <TableHead>{t('table.status')}</TableHead>
                      <SortableTableHead label={t('table.updatedAt')} sortKey="updatedAt" sort={sort} onToggle={toggleSort} />
                      <SortableTableHead label={t('table.publishedAt')} sortKey="publishedAt" sort={sort} onToggle={toggleSort} />
                      <TableHead>{t('table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(sorted || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {t('table.noPages')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      (sorted || []).map((item: PageItem) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <p className="font-medium truncate max-w-xs">{item.title}</p>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded">/{item.slug}</code>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{t(`pageType.${item.pageType}`)}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={STATUS_VARIANT[item.status] || 'secondary'}>
                              {t(`status.${item.status}`)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {new Date(item.updatedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setActionMenuId(actionMenuId === item.id ? null : item.id)}
                                className="p-1 rounded hover:bg-gray-100"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                              {actionMenuId === item.id && (
                                <div className="absolute right-0 top-8 z-10 w-36 rounded-md border bg-white shadow-lg py-1">
                                  <Link
                                    href={`/content/pages/${item.id}/edit`}
                                    className="block px-3 py-1.5 text-sm hover:bg-gray-50"
                                    onClick={() => setActionMenuId(null)}
                                  >
                                    {t('editor.edit')}
                                  </Link>
                                  {item.status !== 'published' && (
                                    <button
                                      type="button"
                                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50"
                                      onClick={() => handleSingleAction(item.id, 'publish')}
                                    >
                                      {t('editor.publish')}
                                    </button>
                                  )}
                                  {item.status !== 'archived' && (
                                    <button
                                      type="button"
                                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50"
                                      onClick={() => handleSingleAction(item.id, 'archive')}
                                    >
                                      {t('editor.archive')}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                                    onClick={() => { setDeleteId(item.id); setActionMenuId(null); }}
                                  >
                                    {t('editor.delete')}
                                  </button>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 flex justify-center">
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteId}
        title={t('editor.confirmDeleteTitle')}
        description={t('editor.confirmDeleteDesc')}
        confirmText={t('editor.delete')}
        cancelText={t('common:actions.cancel')}
        isDestructive={true}
        onConfirm={() => {
          if (deleteId) handleSingleAction(deleteId, 'delete');
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
