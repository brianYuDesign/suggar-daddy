'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { useSort } from '@/lib/use-sort';
import { useSelection } from '@/lib/use-selection';
import { useToast } from '@/components/toast';
import { StatsCard } from '@/components/stats-card';
import { Pagination } from '@/components/pagination';
import { SortableTableHead } from '@/components/sortable-table-head';
import { BatchActionBar } from '@/components/batch-action-bar';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Select,
  Skeleton,
  Avatar,
  Input,
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@suggar-daddy/ui';
import { FileText, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export default function ContentPage() {
  const { t } = useTranslation('content');
  const toast = useToast();
  const [tab, setTab] = useState<'reports' | 'posts'>('reports');

  // Reports state
  const [reportPage, setReportPage] = useState(1);
  const [reportStatus, setReportStatus] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);
  const limit = 20;

  // Posts state
  const [postPage, setPostPage] = useState(1);
  const [postVisibility, setPostVisibility] = useState('');
  const [postSearch, setPostSearch] = useState('');
  const [postSearchInput, setPostSearchInput] = useState('');

  const stats = useAdminQuery(() => adminApi.getContentStats());
  const reports = useAdminQuery(
    () => adminApi.listReports(reportPage, limit, reportStatus || undefined),
    [reportPage, reportStatus],
  );
  const posts = useAdminQuery(
    () => adminApi.listPosts(postPage, limit, postVisibility || undefined, postSearch || undefined),
    [postPage, postVisibility, postSearch],
  );

  const { sorted: sortedReports, sort: reportSort, toggleSort: toggleReportSort } = useSort(reports.data?.data, 'createdAt');
  const { sorted: sortedPosts, sort: postSort, toggleSort: togglePostSort } = useSort(posts.data?.data, 'createdAt');
  const reportSelection = useSelection(reports.data?.data);

  const reportTotalPages = reports.data ? Math.ceil(reports.data.total / limit) : 0;
  const postTotalPages = posts.data ? Math.ceil(posts.data.total / limit) : 0;

  const statusVariant = (s: string) => {
    switch (s) {
      case 'pending': return 'warning';
      case 'resolved': return 'success';
      case 'dismissed': return 'secondary';
      default: return 'outline';
    }
  };

  const handleBatchResolve = async () => {
    if (reportSelection.selectedCount === 0) return;
    setBatchLoading(true);
    try {
      const result = await adminApi.batchResolveReports(reportSelection.selectedIds);
      toast.success(t('reports.batchSuccess', { count: result.resolvedCount }));
      reportSelection.clear();
      reports.refetch();
      stats.refetch();
    } catch (err) {
      console.error('Batch resolve failed:', err);
      toast.error(t('reports.batchFailed'));
    } finally {
      setBatchLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {stats.loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[100px]" />)
        ) : (
          <>
            <StatsCard title={t('stats.totalPosts')} value={stats.data?.totalPosts ?? 0} icon={FileText} />
            <StatsCard title={t('stats.pendingReports')} value={stats.data?.pendingReports ?? 0} icon={AlertTriangle} />
            <StatsCard title={t('stats.resolved')} value={stats.data?.resolvedReports ?? 0} icon={CheckCircle} />
            <StatsCard title={t('stats.takenDown')} value={stats.data?.takenDownCount ?? 0} icon={XCircle} />
          </>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'reports' | 'posts')}>
        <TabsList>
          <TabsTrigger value="reports" active={tab === 'reports'} onClick={() => setTab('reports')}>
            {t('tabs.reports')} {reports.data && `(${reports.data.total})`}
          </TabsTrigger>
          <TabsTrigger value="posts" active={tab === 'posts'} onClick={() => setTab('posts')}>
            {t('tabs.allPosts')} {posts.data && `(${posts.data.total})`}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'reports' && (
        <>
          {/* Batch Action Bar for Reports */}
          <BatchActionBar selectedCount={reportSelection.selectedCount} onClear={reportSelection.clear}>
            <Button
              variant="default"
              size="sm"
              onClick={handleBatchResolve}
              disabled={batchLoading}
            >
              {batchLoading ? t('reports.resolving') : t('reports.resolveSelected')}
            </Button>
          </BatchActionBar>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{t('reports.title')}</CardTitle>
              <Select value={reportStatus} onChange={(e) => { setReportStatus(e.target.value); setReportPage(1); }} className="w-36">
                <option value="">{t('filters.all')}</option>
                <option value="pending">{t('filters.pending')}</option>
                <option value="resolved">{t('filters.resolved')}</option>
                <option value="dismissed">{t('filters.dismissed')}</option>
              </Select>
            </CardHeader>
            <CardContent>
              {reports.loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <input
                            type="checkbox"
                            checked={reportSelection.allSelected}
                            onChange={reportSelection.toggleAll}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </TableHead>
                        <TableHead>{t('reports.reportId')}</TableHead>
                        <TableHead>{t('reports.postId')}</TableHead>
                        <SortableTableHead label={t('reports.reason')} sortKey="reason" sort={reportSort} onToggle={toggleReportSort} />
                        <SortableTableHead label={t('reports.status')} sortKey="status" sort={reportSort} onToggle={toggleReportSort} />
                        <SortableTableHead label={t('reports.date')} sortKey="createdAt" sort={reportSort} onToggle={toggleReportSort} />
                        <TableHead>{t('common:table.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedReports?.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={reportSelection.isSelected(report.id)}
                              onChange={() => reportSelection.toggle(report.id)}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs">{report.id?.slice(0, 8) ?? '-'}...</TableCell>
                          <TableCell className="font-mono text-xs">{report.postId?.slice(0, 8) ?? '-'}...</TableCell>
                          <TableCell>{report.reason}</TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(report.status)}>{report.status}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(report.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Link href={`/content/reports/${report.id}`} className="text-sm text-primary hover:underline">
                              {t('reports.review')}
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                      {sortedReports?.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground">{t('reports.noReports')}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  <div className="mt-4 flex justify-center">
                    <Pagination page={reportPage} totalPages={reportTotalPages} onPageChange={setReportPage} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {tab === 'posts' && (
        <>
          <div className="flex gap-4">
            <Input
              placeholder={t('posts.searchPlaceholder')}
              value={postSearchInput}
              onChange={(e) => setPostSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setPostSearch(postSearchInput); setPostPage(1); } }}
              className="w-64"
            />
            <Select
              value={postVisibility}
              onChange={(e) => { setPostVisibility(e.target.value); setPostPage(1); }}
              className="w-40"
            >
              <option value="">{t('posts.allVisibility')}</option>
              <option value="public">{t('posts.public')}</option>
              <option value="subscribers">{t('posts.subscribers')}</option>
              <option value="ppv">{t('posts.ppv')}</option>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t('posts.title')} {posts.data && <span className="font-normal text-muted-foreground">({posts.data.total} total)</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {posts.loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('posts.creator')}</TableHead>
                        <TableHead>{t('posts.caption')}</TableHead>
                        <SortableTableHead label={t('posts.type')} sortKey="contentType" sort={postSort} onToggle={togglePostSort} />
                        <SortableTableHead label={t('posts.visibility')} sortKey="visibility" sort={postSort} onToggle={togglePostSort} />
                        <SortableTableHead label={t('posts.likes')} sortKey="likeCount" sort={postSort} onToggle={togglePostSort} />
                        <SortableTableHead label={t('posts.date')} sortKey="createdAt" sort={postSort} onToggle={togglePostSort} />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedPosts?.map((post) => (
                        <TableRow key={post.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar src={post.creator?.avatarUrl} fallback={post.creator?.displayName || '?'} size="sm" />
                              <div>
                                <p className="text-sm font-medium">{post.creator?.displayName || t('posts.unknown')}</p>
                                <p className="text-xs text-muted-foreground">{post.creator?.email || '-'}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">{post.caption || '-'}</TableCell>
                          <TableCell><Badge variant="secondary">{post.contentType || '-'}</Badge></TableCell>
                          <TableCell><Badge variant="secondary">{post.visibility || '-'}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {post.likeCount} likes, {post.commentCount} comments
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                      {sortedPosts?.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">{t('posts.noPosts')}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  <div className="mt-4 flex justify-center">
                    <Pagination page={postPage} totalPages={postTotalPages} onPageChange={setPostPage} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
