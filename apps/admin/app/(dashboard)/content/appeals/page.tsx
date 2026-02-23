'use client';

import { useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { useToast } from '@/components/toast';
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
  Button,
  Skeleton,
} from '@suggar-daddy/ui';
import { Scale, CheckCircle, XCircle } from 'lucide-react';

export default function AppealsPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, refetch } = useAdminQuery(
    ['appeals', page],
    () => adminApi.getAppeals(page, limit, 'pending'),
  );

  const handleResolve = async (appealId: string, action: 'grant' | 'deny') => {
    try {
      await adminApi.resolveAppeal(appealId, action);
      toast.success(action === 'grant' ? 'Appeal granted - content reinstated' : 'Appeal denied');
      refetch();
    } catch {
      toast.error('Failed to resolve appeal');
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'granted':
        return <Badge variant="default">Granted</Badge>;
      case 'denied':
        return <Badge variant="destructive">Denied</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Content Appeals</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5" />
            Pending Appeals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !data?.data?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No pending appeals</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Appeal ID</TableHead>
                  <TableHead>Content Type</TableHead>
                  <TableHead>Content ID</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((appeal) => (
                  <TableRow key={appeal.id}>
                    <TableCell className="font-mono text-xs">
                      {appeal.id.slice(0, 16)}...
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{appeal.contentType}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {appeal.contentId.slice(0, 12)}...
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {appeal.userId.slice(0, 12)}...
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {appeal.reason}
                    </TableCell>
                    <TableCell>{statusBadge(appeal.status)}</TableCell>
                    <TableCell className="text-xs">
                      {new Date(appeal.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {appeal.status === 'pending' && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResolve(appeal.id, 'grant')}
                            title="Grant appeal"
                          >
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResolve(appeal.id, 'deny')}
                            title="Deny appeal"
                          >
                            <XCircle className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {data && data.total > limit && (
            <div className="flex justify-center mt-4 gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm self-center">
                Page {page} of {Math.ceil(data.total / limit)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= Math.ceil(data.total / limit)}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
