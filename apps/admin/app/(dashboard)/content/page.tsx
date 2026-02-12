'use client';

import { useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { StatsCard } from '@/components/stats-card';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Select, Skeleton } from '@suggar-daddy/ui';
import { Pagination } from '@/components/pagination';
import { FileText, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export default function ContentPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const limit = 20;

  const stats = useAdminQuery(() => adminApi.getContentStats());
  const reports = useAdminQuery(
    () => adminApi.listReports(page, limit, status || undefined),
    [page, status],
  );

  const totalPages = reports.data ? Math.ceil(reports.data.total / limit) : 0;

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

      {/* Report List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Reports {reports.data && <span className="font-normal text-muted-foreground">({reports.data.total})</span>}
          </CardTitle>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-36">
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
                        <Link
                          href={`/content/reports/${report.id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          Review
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                  {reports.data?.data.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No reports found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="mt-4 flex justify-center">
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
