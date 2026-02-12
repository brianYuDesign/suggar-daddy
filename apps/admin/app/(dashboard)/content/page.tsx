'use client';

import { useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { StatsCard } from '@/components/stats-card';
import { Pagination } from '@/components/pagination';
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
  Tabs,
  TabsList,
  TabsTrigger,
} from '@suggar-daddy/ui';
import { FileText, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export default function ContentPage() {
  const [tab, setTab] = useState<'reports' | 'posts'>('reports');

  // Reports state
  const [reportPage, setReportPage] = useState(1);
  const [reportStatus, setReportStatus] = useState('');
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Content Moderation</h1>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {stats.loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[100px]" />)
        ) : (
          <>
            <StatsCard title="Total Posts" value={stats.data?.totalPosts ?? 0} icon={FileText} />
            <StatsCard title="Pending Reports" value={stats.data?.pendingReports ?? 0} icon={AlertTriangle} />
            <StatsCard title="Resolved" value={stats.data?.resolvedReports ?? 0} icon={CheckCircle} />
            <StatsCard title="Taken Down" value={stats.data?.takenDownCount ?? 0} icon={XCircle} />
          </>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'reports' | 'posts')}>
        <TabsList>
          <TabsTrigger value="reports" active={tab === 'reports'} onClick={() => setTab('reports')}>
            Reports {reports.data && `(${reports.data.total})`}
          </TabsTrigger>
          <TabsTrigger value="posts" active={tab === 'posts'} onClick={() => setTab('posts')}>
            All Posts {posts.data && `(${posts.data.total})`}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'reports' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Reports</CardTitle>
            <Select value={reportStatus} onChange={(e) => { setReportStatus(e.target.value); setReportPage(1); }} className="w-36">
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
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
                      <TableHead>Report ID</TableHead>
                      <TableHead>Post ID</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.data?.data.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-mono text-xs">{report.id.slice(0, 8)}...</TableCell>
                        <TableCell className="font-mono text-xs">{report.postId.slice(0, 8)}...</TableCell>
                        <TableCell>{report.reason}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(report.status)}>{report.status}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Link href={`/content/reports/${report.id}`} className="text-sm text-primary hover:underline">
                            Review
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                    {reports.data?.data.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">No reports found</TableCell>
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
      )}

      {tab === 'posts' && (
        <>
          <div className="flex gap-4">
            <Input
              placeholder="Search by caption..."
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
              <option value="">All Visibility</option>
              <option value="public">Public</option>
              <option value="subscribers">Subscribers</option>
              <option value="ppv">Pay-per-view</option>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Posts {posts.data && <span className="font-normal text-muted-foreground">({posts.data.total} total)</span>}
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
                        <TableHead>Creator</TableHead>
                        <TableHead>Caption</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Visibility</TableHead>
                        <TableHead>Engagement</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {posts.data?.data.map((post) => (
                        <TableRow key={post.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar src={post.creator?.avatarUrl} fallback={post.creator?.displayName || '?'} size="sm" />
                              <div>
                                <p className="text-sm font-medium">{post.creator?.displayName || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground">{post.creator?.email || '—'}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">{post.caption || '—'}</TableCell>
                          <TableCell><Badge variant="secondary">{post.contentType || '—'}</Badge></TableCell>
                          <TableCell><Badge variant="secondary">{post.visibility || '—'}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {post.likeCount} likes, {post.commentCount} comments
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                      {posts.data?.data.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">No posts found</TableCell>
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
