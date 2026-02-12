'use client';

import { useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { useSort } from '@/lib/use-sort';
import { StatsCard } from '@/components/stats-card';
import { Pagination } from '@/components/pagination';
import { SortableTableHead } from '@/components/sortable-table-head';
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
  Avatar,
  Skeleton,
} from '@suggar-daddy/ui';
import { CreditCard, DollarSign, ArrowUpDown } from 'lucide-react';
import { CsvExport } from '@/components/csv-export';

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'warning'> = {
  completed: 'default',
  pending: 'warning',
  failed: 'destructive',
  refunded: 'secondary',
};

const typeLabels: Record<string, string> = {
  tip: 'Tip',
  subscription: 'Subscription',
  post_purchase: 'Post Purchase',
  withdrawal: 'Withdrawal',
};

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const limit = 20;

  const typeStats = useAdminQuery(() => adminApi.getTransactionTypeStats());
  const { data, loading } = useAdminQuery(
    () => adminApi.listTransactions(page, limit, typeFilter || undefined, statusFilter || undefined),
    [page, typeFilter, statusFilter],
  );

  const { sorted, sort, toggleSort } = useSort(data?.data, 'createdAt');

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <CsvExport
          data={data?.data}
          columns={[
            { key: 'id', label: 'ID' },
            { key: 'type', label: 'Type' },
            { key: 'amount', label: 'Amount' },
            { key: 'status', label: 'Status' },
            { key: 'stripePaymentId', label: 'Stripe ID' },
            { key: 'createdAt', label: 'Date' },
          ]}
          filename="transactions"
        />
      </div>

      {/* Type Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {typeStats.loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[100px]" />)
        ) : (
          <>
            {typeStats.data?.byType.map((t) => (
              <StatsCard
                key={t.type}
                title={typeLabels[t.type] || t.type}
                value={t.count}
                icon={t.type === 'tip' ? DollarSign : CreditCard}
                description={`$${t.totalAmount.toLocaleString()} total`}
              />
            ))}
            {(!typeStats.data?.byType || typeStats.data.byType.length === 0) && (
              <StatsCard title="Transactions" value={0} icon={ArrowUpDown} />
            )}
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="w-44"
        >
          <option value="">All Types</option>
          <option value="tip">Tip</option>
          <option value="subscription">Subscription</option>
          <option value="post_purchase">Post Purchase</option>
          <option value="withdrawal">Withdrawal</option>
        </Select>
        <Select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="w-44"
        >
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Transaction List{' '}
            {data && (
              <span className="font-normal text-muted-foreground">({data.total} total)</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <SortableTableHead label="Type" sortKey="type" sort={sort} onToggle={toggleSort} />
                    <SortableTableHead label="Amount" sortKey="amount" sort={sort} onToggle={toggleSort} />
                    <SortableTableHead label="Status" sortKey="status" sort={sort} onToggle={toggleSort} />
                    <TableHead>Stripe ID</TableHead>
                    <SortableTableHead label="Date" sortKey="createdAt" sort={sort} onToggle={toggleSort} />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted?.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar src={tx.user?.avatarUrl} fallback={tx.user?.displayName || '?'} size="sm" />
                          <div>
                            <p className="text-sm font-medium">{tx.user?.displayName || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{tx.user?.email || '-'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{typeLabels[tx.type] || tx.type}</Badge>
                      </TableCell>
                      <TableCell className="font-semibold">${tx.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[tx.status] || 'secondary'}>{tx.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono max-w-[150px] truncate">
                        {tx.stripePaymentId || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {sorted?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No transactions found
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
