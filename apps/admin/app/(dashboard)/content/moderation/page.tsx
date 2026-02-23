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
import { Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export default function ModerationQueuePage() {
  const toast = useToast();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  const { data, isLoading, refetch } = useAdminQuery(
    ['moderation-queue'],
    () => adminApi.getModerationQueue(),
  );

  const { data: stats } = useAdminQuery(
    ['moderation-stats'],
    () => adminApi.getModerationStats(),
  );

  const handleBulkAction = async (action: 'approve' | 'takedown') => {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      await adminApi.bulkModerationAction(selectedIds, action);
      toast.success(`${action === 'approve' ? 'Approved' : 'Taken down'} ${selectedIds.length} items`);
      setSelectedIds([]);
      refetch();
    } catch {
      toast.error('Bulk action failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const toggleSelect = (contentId: string) => {
    setSelectedIds((prev) =>
      prev.includes(contentId)
        ? prev.filter((id) => id !== contentId)
        : [...prev, contentId],
    );
  };

  const severityBadge = (severity: string | null) => {
    switch (severity) {
      case 'high':
        return <Badge variant="destructive">HIGH</Badge>;
      case 'medium':
        return <Badge variant="secondary">MEDIUM</Badge>;
      case 'low':
        return <Badge variant="outline">LOW</Badge>;
      default:
        return <Badge variant="outline">N/A</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Moderation Queue</h1>
        {selectedIds.length > 0 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('approve')}
              disabled={bulkLoading}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Approve ({selectedIds.length})
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleBulkAction('takedown')}
              disabled={bulkLoading}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Take Down ({selectedIds.length})
            </Button>
          </div>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats?.flaggedCount ?? '-'}</div>
            <p className="text-xs text-muted-foreground">Flagged Items</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats?.pendingReports ?? '-'}</div>
            <p className="text-xs text-muted-foreground">Pending Reports</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats?.takenDownCount ?? '-'}</div>
            <p className="text-xs text-muted-foreground">Taken Down</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats?.totalPosts ?? '-'}</div>
            <p className="text-xs text-muted-foreground">Total Posts</p>
          </CardContent>
        </Card>
      </div>

      {/* Queue table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Auto-flagged Content
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
              <p>No flagged content. All clear!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(data.data.map((item) => item.contentId));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Content ID</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Flagged Words</TableHead>
                  <TableHead>NSFW Score</TableHead>
                  <TableHead>Flagged At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((item) => (
                  <TableRow key={item.contentId}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.contentId)}
                        onChange={() => toggleSelect(item.contentId)}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.contentType}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {item.contentId.slice(0, 12)}...
                    </TableCell>
                    <TableCell>
                      {severityBadge(item.moderationResult?.overallSeverity ?? null)}
                    </TableCell>
                    <TableCell>
                      {item.moderationResult?.textResult?.category || '-'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {item.moderationResult?.textResult?.flaggedWords?.join(', ') || '-'}
                    </TableCell>
                    <TableCell>
                      {item.moderationResult?.imageResults?.[0]?.nsfwScore !== undefined
                        ? (item.moderationResult.imageResults[0].nsfwScore * 100).toFixed(1) + '%'
                        : '-'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(item.flaggedAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            await adminApi.bulkModerationAction([item.contentId], 'approve');
                            toast.success('Approved');
                            refetch();
                          }}
                        >
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            await adminApi.bulkModerationAction([item.contentId], 'takedown');
                            toast.success('Taken down');
                            refetch();
                          }}
                        >
                          <XCircle className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
