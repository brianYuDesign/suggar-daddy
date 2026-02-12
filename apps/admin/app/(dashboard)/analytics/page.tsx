'use client';

import { useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { SimpleBarChart } from '@/components/simple-chart';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Select, Skeleton, TabsList, TabsTrigger } from '@suggar-daddy/ui';
import { StatsCard } from '@/components/stats-card';
import { Heart, Users, Zap, Target } from 'lucide-react';

export default function AnalyticsPage() {
  const [dauDays, setDauDays] = useState(7);
  const [churnPeriod, setChurnPeriod] = useState('month');

  const dauMau = useAdminQuery(() => adminApi.getDauMau(dauDays), [dauDays]);
  const creatorRevenue = useAdminQuery(() => adminApi.getCreatorRevenueRanking(10));
  const popularContent = useAdminQuery(() => adminApi.getPopularContent(10));
  const churnRate = useAdminQuery(() => adminApi.getSubscriptionChurnRate(churnPeriod), [churnPeriod]);
  const matching = useAdminQuery(() => adminApi.getMatchingStats());

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>

      {/* Matching Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Matching Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          {matching.loading ? (
            <Skeleton className="h-[200px]" />
          ) : matching.data ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatsCard title="Total Swipes" value={matching.data.totalSwipes.toLocaleString()} icon={Zap} />
                <StatsCard title="Total Matches" value={matching.data.totalMatches.toLocaleString()} icon={Heart} />
                <StatsCard title="Active Matches" value={matching.data.activeMatches.toLocaleString()} icon={Users} />
                <StatsCard
                  title="Match Rate"
                  value={`${matching.data.matchRate}%`}
                  icon={Target}
                  description={`${matching.data.likeCount} likes, ${matching.data.passCount} passes`}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-md bg-muted p-4">
                  <p className="text-sm text-muted-foreground">Likes</p>
                  <p className="mt-1 text-2xl font-bold">{matching.data.likeCount.toLocaleString()}</p>
                </div>
                <div className="rounded-md bg-muted p-4">
                  <p className="text-sm text-muted-foreground">Passes</p>
                  <p className="mt-1 text-2xl font-bold">{matching.data.passCount.toLocaleString()}</p>
                </div>
                <div className="rounded-md bg-muted p-4">
                  <p className="text-sm text-muted-foreground">Super Likes</p>
                  <p className="mt-1 text-2xl font-bold">{matching.data.superLikeCount.toLocaleString()}</p>
                </div>
              </div>
              {matching.data.dailyMatches.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">Daily Matches (14 days)</p>
                  <SimpleBarChart
                    data={matching.data.dailyMatches.map((d) => ({
                      label: d.date.slice(5),
                      value: d.count,
                    }))}
                  />
                </div>
              )}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No matching data</p>
          )}
        </CardContent>
      </Card>

      {/* DAU/MAU */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Daily / Monthly Active Users</CardTitle>
          <Select value={String(dauDays)} onChange={(e) => setDauDays(Number(e.target.value))} className="w-32">
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
          </Select>
        </CardHeader>
        <CardContent>
          {dauMau.loading ? (
            <Skeleton className="h-[250px]" />
          ) : dauMau.data ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-md bg-muted p-4">
                  <p className="text-sm text-muted-foreground">DAU (Today)</p>
                  <p className="mt-1 text-2xl font-bold">{dauMau.data.dau.toLocaleString()}</p>
                </div>
                <div className="rounded-md bg-muted p-4">
                  <p className="text-sm text-muted-foreground">MAU (30 days)</p>
                  <p className="mt-1 text-2xl font-bold">{dauMau.data.mau.toLocaleString()}</p>
                </div>
                <div className="rounded-md bg-muted p-4">
                  <p className="text-sm text-muted-foreground">DAU/MAU Ratio</p>
                  <p className="mt-1 text-2xl font-bold">{dauMau.data.dauMauRatio}%</p>
                </div>
              </div>
              {dauMau.data.dailyDau.length > 0 && (
                <SimpleBarChart
                  data={dauMau.data.dailyDau.map((d) => ({
                    label: d.date.slice(5),
                    value: d.count,
                  }))}
                />
              )}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No DAU/MAU data</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Creator Revenue Ranking */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Creator Revenue Ranking</CardTitle>
          </CardHeader>
          <CardContent>
            {creatorRevenue.loading ? (
              <Skeleton className="h-[200px]" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Creator</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Tips</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creatorRevenue.data?.map((c, i) => (
                    <TableRow key={c.creatorId}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">{c.displayName}</TableCell>
                      <TableCell>${c.totalRevenue.toLocaleString()}</TableCell>
                      <TableCell>{c.tipCount}</TableCell>
                    </TableRow>
                  ))}
                  {creatorRevenue.data?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">No data</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Popular Content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Popular Content</CardTitle>
          </CardHeader>
          <CardContent>
            {popularContent.loading ? (
              <Skeleton className="h-[200px]" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Post</TableHead>
                    <TableHead>Engagement</TableHead>
                    <TableHead>Likes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {popularContent.data?.map((p, i) => (
                    <TableRow key={p.postId}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {p.caption || p.postId.slice(0, 12) + '...'}
                      </TableCell>
                      <TableCell className="font-medium">{p.engagement}</TableCell>
                      <TableCell>{p.likeCount}</TableCell>
                    </TableRow>
                  ))}
                  {popularContent.data?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">No data</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Churn Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Subscription Churn Rate</CardTitle>
          <TabsList>
            {['week', 'month', 'quarter'].map((p) => (
              <TabsTrigger
                key={p}
                value={p}
                active={churnPeriod === p}
                onClick={() => setChurnPeriod(p)}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>
        </CardHeader>
        <CardContent>
          {churnRate.loading ? (
            <Skeleton className="h-[120px]" />
          ) : churnRate.data ? (
            <div className="grid gap-4 sm:grid-cols-5">
              <div className="rounded-md bg-muted p-4">
                <p className="text-sm text-muted-foreground">Churn Rate</p>
                <p className="mt-1 text-2xl font-bold">{churnRate.data.churnRate}%</p>
              </div>
              <div className="rounded-md bg-muted p-4">
                <p className="text-sm text-muted-foreground">Active (Start)</p>
                <p className="mt-1 text-2xl font-bold">{churnRate.data.activeAtStart}</p>
              </div>
              <div className="rounded-md bg-muted p-4">
                <p className="text-sm text-muted-foreground">Cancelled</p>
                <p className="mt-1 text-2xl font-bold">{churnRate.data.cancelledDuring}</p>
              </div>
              <div className="rounded-md bg-muted p-4">
                <p className="text-sm text-muted-foreground">New</p>
                <p className="mt-1 text-2xl font-bold">{churnRate.data.newDuring}</p>
              </div>
              <div className="rounded-md bg-muted p-4">
                <p className="text-sm text-muted-foreground">Current Active</p>
                <p className="mt-1 text-2xl font-bold">{churnRate.data.currentActive}</p>
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No churn data</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
