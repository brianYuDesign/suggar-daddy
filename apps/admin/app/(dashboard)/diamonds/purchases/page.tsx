'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { Pagination } from '@/components/pagination';
import { Card, CardHeader, CardTitle, CardContent } from '@suggar-daddy/ui';

export default function DiamondPurchasesPage() {
  const { t } = useTranslation('diamonds');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [userId, setUserId] = useState('');
  const [userIdInput, setUserIdInput] = useState('');
  const limit = 20;

  const { data, loading } = useAdminQuery(
    () => adminApi.listDiamondPurchases(page, limit, status || undefined, userId || undefined),
    [page, status, userId],
  );

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('purchases.title')}</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">{t('purchases.allStatuses')}</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={t('purchases.filterByUser')}
            value={userIdInput}
            onChange={(e) => setUserIdInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setUserId(userIdInput); setPage(1); } }}
            className="w-64 rounded-md border bg-background px-3 py-2 text-sm"
          />
          <button
            onClick={() => { setUserId(userIdInput); setPage(1); }}
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            {t('common:actions.search')}
          </button>
          {userId && (
            <button
              onClick={() => { setUserId(''); setUserIdInput(''); setPage(1); }}
              className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
            >
              {t('common:batch.clear')}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t('purchases.title')}{' '}
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
            <p className="text-sm text-muted-foreground">{t('purchases.noPurchases')}</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">{t('table.user')}</th>
                      <th className="pb-2 font-medium">{t('purchases.package')}</th>
                      <th className="pb-2 font-medium">{t('table.diamonds')}</th>
                      <th className="pb-2 font-medium">{t('packages.bonus')}</th>
                      <th className="pb-2 font-medium">{t('purchases.total')}</th>
                      <th className="pb-2 font-medium">{t('table.usd')}</th>
                      <th className="pb-2 font-medium">{t('table.status')}</th>
                      <th className="pb-2 font-medium">{t('table.date')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((p) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="py-2">
                          <span className="font-mono text-xs">
                            {p.user?.displayName || p.userId.slice(0, 8)}
                          </span>
                        </td>
                        <td className="py-2 font-mono text-xs">{p.packageId.slice(0, 12)}</td>
                        <td className="py-2">{p.diamondAmount.toLocaleString()}</td>
                        <td className="py-2">{p.bonusDiamonds > 0 ? `+${p.bonusDiamonds}` : '-'}</td>
                        <td className="py-2 font-medium">{p.totalDiamonds.toLocaleString()}</td>
                        <td className="py-2">${Number(p.amountUsd).toFixed(2)}</td>
                        <td className="py-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              p.status === 'completed'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : p.status === 'failed'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-2 text-muted-foreground">
                          {new Date(p.createdAt).toLocaleString()}
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
