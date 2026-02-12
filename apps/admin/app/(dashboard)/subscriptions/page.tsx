'use client';

import { useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { useToast } from '@/components/toast';
import { ApiError } from '@suggar-daddy/api-client';
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
  Avatar,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  Button,
} from '@suggar-daddy/ui';
import { Users, TrendingUp, XCircle, CreditCard, DollarSign } from 'lucide-react';

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'warning'> = {
  active: 'default',
  cancelled: 'destructive',
  expired: 'secondary',
  past_due: 'warning',
};

export default function SubscriptionsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<'subscriptions' | 'tiers'>('subscriptions');
  const [page, setPage] = useState(1);
  const [tierPage, setTierPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);
  const limit = 20;

  const stats = useAdminQuery(() => adminApi.getSubscriptionStats());
  const subs = useAdminQuery(
    () => adminApi.listSubscriptions(page, limit, statusFilter || undefined),
    [page, statusFilter],
  );
  const tiers = useAdminQuery(
    () => adminApi.listTiers(tierPage, limit),
    [tierPage],
  );

  const subTotalPages = subs.data ? Math.ceil(subs.data.total / limit) : 0;
  const tierTotalPages = tiers.data ? Math.ceil(tiers.data.total / limit) : 0;

  const handleToggleTier = async (tierId: string, tierName: string) => {
    setToggling(tierId);
    try {
      const res = await adminApi.toggleTierActive(tierId);
      toast.success(`"${tierName}" ${res.isActive ? 'activated' : 'deactivated'}`);
      tiers.refetch();
    } catch (err) {
      toast.error(ApiError.getMessage(err, 'Failed to update tier'));
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Subscriptions</h1>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {stats.loading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[100px]" />)
        ) : (
          <>
            <StatsCard title="Active" value={stats.data?.totalActive ?? 0} icon={Users} />
            <StatsCard title="Cancelled" value={stats.data?.totalCancelled ?? 0} icon={XCircle} />
            <StatsCard title="Expired" value={stats.data?.totalExpired ?? 0} icon={CreditCard} />
            <StatsCard title="Total" value={stats.data?.total ?? 0} icon={TrendingUp} />
            <StatsCard
              title="MRR"
              value={`$${(stats.data?.mrr ?? 0).toLocaleString()}`}
              icon={DollarSign}
            />
          </>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'subscriptions' | 'tiers')}>
        <TabsList>
          <TabsTrigger value="subscriptions" active={tab === 'subscriptions'} onClick={() => setTab('subscriptions')}>
            Subscriptions
          </TabsTrigger>
          <TabsTrigger value="tiers" active={tab === 'tiers'} onClick={() => setTab('tiers')}>
            Tiers
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'subscriptions' && (
        <>
          {/* Filters */}
          <div className="flex gap-4">
            <Select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-44"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Subscription List{' '}
                {subs.data && (
                  <span className="font-normal text-muted-foreground">({subs.data.total} total)</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subs.loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subscriber</TableHead>
                        <TableHead>Creator</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subs.data?.data.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar src={s.subscriber?.avatarUrl} fallback={s.subscriber?.displayName || '?'} size="sm" />
                              <div>
                                <p className="text-sm font-medium">{s.subscriber?.displayName || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground">{s.subscriber?.email || '—'}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar src={s.creator?.avatarUrl} fallback={s.creator?.displayName || '?'} size="sm" />
                              <div>
                                <p className="text-sm font-medium">{s.creator?.displayName || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground">{s.creator?.email || '—'}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{s.tier?.name || '—'}</TableCell>
                          <TableCell className="text-sm font-semibold">
                            ${s.tier?.priceMonthly?.toFixed(2) || '0.00'}/mo
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant[s.status] || 'secondary'}>{s.status}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(s.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                      {subs.data?.data.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            No subscriptions found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  <div className="mt-4 flex justify-center">
                    <Pagination page={page} totalPages={subTotalPages} onPageChange={setPage} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {tab === 'tiers' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Subscription Tiers{' '}
              {tiers.data && (
                <span className="font-normal text-muted-foreground">({tiers.data.total} total)</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tiers.loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tier Name</TableHead>
                      <TableHead>Creator</TableHead>
                      <TableHead>Monthly</TableHead>
                      <TableHead>Yearly</TableHead>
                      <TableHead>Subscribers</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tiers.data?.data.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <p className="text-sm font-medium">{t.name}</p>
                          {t.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {t.creator?.displayName || t.creator?.email || '—'}
                        </TableCell>
                        <TableCell className="text-sm font-semibold">${t.priceMonthly.toFixed(2)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {t.priceYearly ? `$${t.priceYearly.toFixed(2)}` : '—'}
                        </TableCell>
                        <TableCell className="text-sm">{t.activeSubscribers}</TableCell>
                        <TableCell>
                          <Badge variant={t.isActive ? 'default' : 'secondary'}>
                            {t.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant={t.isActive ? 'outline' : 'default'}
                            onClick={() => handleToggleTier(t.id, t.name)}
                            disabled={toggling === t.id}
                          >
                            {toggling === t.id ? '...' : t.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {tiers.data?.data.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No tiers found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <div className="mt-4 flex justify-center">
                  <Pagination page={tierPage} totalPages={tierTotalPages} onPageChange={setTierPage} />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
