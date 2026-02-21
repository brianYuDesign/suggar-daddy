'use client';

import { useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { Pagination } from '@/components/pagination';
import { Card, CardHeader, CardTitle, CardContent } from '@suggar-daddy/ui';

const TX_TYPES = ['purchase', 'spend', 'credit', 'transfer_in', 'transfer_out', 'conversion'];

export default function DiamondTransactionsPage() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [userId, setUserId] = useState('');
  const [userIdInput, setUserIdInput] = useState('');
  const limit = 20;

  const { data, loading } = useAdminQuery(
    () => adminApi.listDiamondTransactions(page, limit, type || undefined, userId || undefined),
    [page, type, userId],
  );

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Diamond Transactions</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <select
          value={type}
          onChange={(e) => { setType(e.target.value); setPage(1); }}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">All Types</option>
          {TX_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Filter by User ID..."
            value={userIdInput}
            onChange={(e) => setUserIdInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setUserId(userIdInput); setPage(1); } }}
            className="w-64 rounded-md border bg-background px-3 py-2 text-sm"
          />
          <button
            onClick={() => { setUserId(userIdInput); setPage(1); }}
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            Search
          </button>
          {userId && (
            <button
              onClick={() => { setUserId(''); setUserIdInput(''); setPage(1); }}
              className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Transactions{' '}
            {data && <span className="font-normal text-muted-foreground">({data.total} total)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : !data?.data.length ? (
            <p className="text-sm text-muted-foreground">No transactions found</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">User</th>
                      <th className="pb-2 font-medium">Type</th>
                      <th className="pb-2 font-medium">Amount</th>
                      <th className="pb-2 font-medium">Ref Type</th>
                      <th className="pb-2 font-medium">Description</th>
                      <th className="pb-2 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((tx) => (
                      <tr key={tx.id} className="border-b last:border-0">
                        <td className="py-2">
                          <span className="font-mono text-xs">
                            {tx.user?.displayName || tx.userId.slice(0, 8)}
                          </span>
                        </td>
                        <td className="py-2">
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                            {tx.type}
                          </span>
                        </td>
                        <td className={`py-2 font-medium ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount}
                        </td>
                        <td className="py-2 text-muted-foreground">{tx.referenceType || '-'}</td>
                        <td className="max-w-[200px] truncate py-2 text-muted-foreground">
                          {tx.description || '-'}
                        </td>
                        <td className="py-2 text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex justify-end">
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
