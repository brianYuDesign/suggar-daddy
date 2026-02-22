'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { FileText, Send, FileEdit, Eye, MoreHorizontal, Plus } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { useSort } from '@/lib/use-sort';
import { useSelection } from '@/lib/use-selection';
import { useToast } from '@/components/toast';
import { BatchActionBar } from '@/components/batch-action-bar';
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

interface BlogItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category: string;
  status: string;
  viewCount: number;
  authorName: string | null;
  publishedAt: string | null;
  createdAt: string;
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  published: 'default',
  draft: 'secondary',
  archived: 'outline',
};

export default function BlogListPage() {
  const { t } = useTranslation('blog');
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const limit = 20;

  const { data: stats, loading: statsLoading } = useAdminQuery(
    () => adminApi.getBlogStats(),
    [],
  );

  const { data, loading, refetch } = useAdminQuery(
    () => adminApi.listBlogs(page, limit, category || undefined, status || undefined, search || undefined),
    [page, category, status, search],
  );

  const { sorted, sort, toggleSort } = useSort(data?.items as BlogItem[] | undefined, 'createdAt');
  const selection = useSelection(data?.items as BlogItem[] | undefined);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleBatchPublish = async () => {
    if (selection.selectedCount === 0) return;
    setBatchLoading(true);
    try {
      const result = await adminApi.batchPublishBlogs(selection.selectedIds);
      toast.success(t('batch.publishSuccess', { count: result.publishedCount }));
      selection.clear();
      refetch();
    } catch {
      toast.error(t('editor.saveFailed'));
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBatchArchive = async () => {
    if (selection.selectedCount === 0) return;
    setBatchLoading(true);
    try {
      const result = await adminApi.batchArchiveBlogs(selection.selectedIds);
      toast.success(t('batch.archiveSuccess', { count: result.archivedCount }));
      selection.clear();
      refetch();
    } catch {
      toast.error(t('editor.saveFailed'));
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBatchDelete = async () => {
    setBatchLoading(true);
    try {
      const result = await adminApi.batchDeleteBlogs(selection.selectedIds);
      toast.success(t('batch.deleteSuccess', { count: result.deletedCount }));
      selection.clear();
      refetch();
    } catch {
      toast.error(t('editor.saveFailed'));
    } finally {
      setBatchLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSingleAction = async (id: string, action: 'publish' | 'archive' | 'delete') => {
    setActionMenuId(null);
    try {
      if (action === 'publish') {
        await adminApi.publishBlog(id);
        toast.success(t('batch.publishSuccess', { count: 1 }));
      } else if (action === 'archive') {
        await adminApi.archiveBlog(id);
        toast.success(t('batch.archiveSuccess', { count: 1 }));
      } else if (action === 'delete') {
        await adminApi.deleteBlog(id);
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
        <Link href="/content/blog/create">
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
            <StatsCard title={t('stats.totalViews')} value={(stats?.totalViews ?? 0).toLocaleString()} icon={Eye} />
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
        <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className="w-40">
          <option value="">{t('filters.allCategories')}</option>
          <option value="guide">{t('category.guide')}</option>
          <option value="safety">{t('category.safety')}</option>
          <option value="tips">{t('category.tips')}</option>
          <option value="story">{t('category.story')}</option>
          <option value="news">{t('category.news')}</option>
        </Select>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-40">
          <option value="">{t('filters.allStatus')}</option>
          <option value="draft">{t('status.draft')}</option>
          <option value="published">{t('status.published')}</option>
          <option value="archived">{t('status.archived')}</option>
        </Select>
      </div>

      {/* Batch Action Bar */}
      <BatchActionBar selectedCount={selection.selectedCount} onClear={selection.clear}>
        <Button variant="outline" size="sm" onClick={handleBatchPublish} disabled={batchLoading}>
          {t('batch.publishSelected')}
        </Button>
        <Button variant="outline" size="sm" onClick={handleBatchArchive} disabled={batchLoading}>
          {t('batch.archiveSelected')}
        </Button>
        <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)} disabled={batchLoading}>
          {t('batch.deleteSelected')}
        </Button>
      </BatchActionBar>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('table.blogList')} {data && <span className="font-normal text-muted-foreground">({data.total})</span>}
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
              <div className="mb-3">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={selection.allSelected}
                    onChange={selection.toggleAll}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span>{t('table.selectAll')}</span>
                </label>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <SortableTableHead label={t('table.title')} sortKey="title" sort={sort} onToggle={toggleSort} />
                      <TableHead>{t('table.category')}</TableHead>
                      <TableHead>{t('table.status')}</TableHead>
                      <SortableTableHead label={t('table.views')} sortKey="viewCount" sort={sort} onToggle={toggleSort} />
                      <SortableTableHead label={t('table.publishedAt')} sortKey="publishedAt" sort={sort} onToggle={toggleSort} />
                      <SortableTableHead label={t('table.createdAt')} sortKey="createdAt" sort={sort} onToggle={toggleSort} />
                      <TableHead>{t('table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(sorted || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          {t('table.noBlogs')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      (sorted || []).map((blog: BlogItem) => (
                        <TableRow key={blog.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selection.isSelected(blog.id)}
                              onChange={() => selection.toggle(blog.id)}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              <p className="font-medium truncate">{blog.title}</p>
                              {blog.excerpt && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">{blog.excerpt}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{t(`category.${blog.category}`)}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={STATUS_VARIANT[blog.status] || 'secondary'}>
                              {t(`status.${blog.status}`)}
                            </Badge>
                          </TableCell>
                          <TableCell>{blog.viewCount.toLocaleString()}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {blog.publishedAt ? new Date(blog.publishedAt).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {new Date(blog.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setActionMenuId(actionMenuId === blog.id ? null : blog.id)}
                                className="p-1 rounded hover:bg-gray-100"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                              {actionMenuId === blog.id && (
                                <div className="absolute right-0 top-8 z-10 w-36 rounded-md border bg-white shadow-lg py-1">
                                  <Link
                                    href={`/content/blog/${blog.id}/edit`}
                                    className="block px-3 py-1.5 text-sm hover:bg-gray-50"
                                    onClick={() => setActionMenuId(null)}
                                  >
                                    {t('editor.edit')}
                                  </Link>
                                  {blog.status !== 'published' && (
                                    <button
                                      type="button"
                                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50"
                                      onClick={() => handleSingleAction(blog.id, 'publish')}
                                    >
                                      {t('editor.publish')}
                                    </button>
                                  )}
                                  {blog.status !== 'archived' && (
                                    <button
                                      type="button"
                                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50"
                                      onClick={() => handleSingleAction(blog.id, 'archive')}
                                    >
                                      {t('editor.archive')}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                                    onClick={() => handleSingleAction(blog.id, 'delete')}
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

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title={t('batch.confirmDeleteTitle')}
        description={t('batch.confirmDeleteDesc', { count: selection.selectedCount })}
        confirmText={t('batch.deleteSelected')}
        cancelText={t('common:actions.cancel')}
        isDestructive={true}
        isLoading={batchLoading}
        onConfirm={handleBatchDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        disableOverlayClick={batchLoading}
      />
    </div>
  );
}
