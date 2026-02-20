'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Analytics } from '@/types/creator';
import StatCard from '@/components/creator/StatCard';
import AnalyticsChart from '@/components/analytics/AnalyticsChart';

export default function AnalyticsDashboard() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [analytics] = useState<Analytics>({
    period,
    totalViews: 125400,
    totalEarnings: 5230.50,
    newSubscribers: 1200,
    averageEngagement: 8.5,
    topContent: [
      {
        id: '1',
        creatorId: 'creator1',
        title: 'Amazing Tutorial - How to Start',
        description: 'Learn the basics in this comprehensive tutorial',
        thumbnail: 'https://via.placeholder.com/300x200',
        type: 'video',
        views: 15420,
        likes: 1204,
        comments: 340,
        tags: ['tutorial'],
        status: 'published',
        createdAt: '2026-02-15T10:30:00Z',
        updatedAt: '2026-02-15T10:30:00Z',
      },
      {
        id: '2',
        creatorId: 'creator1',
        title: 'Exclusive Behind the Scenes',
        description: 'Get a peek at how we create content',
        thumbnail: 'https://via.placeholder.com/300x200',
        type: 'video',
        views: 8320,
        likes: 720,
        comments: 180,
        tags: ['behind-the-scenes'],
        status: 'published',
        createdAt: '2026-02-10T15:45:00Z',
        updatedAt: '2026-02-10T15:45:00Z',
      },
    ],
    viewsOverTime: [
      { date: '2026-02-11', views: 5200 },
      { date: '2026-02-12', views: 7100 },
      { date: '2026-02-13', views: 6800 },
      { date: '2026-02-14', views: 9200 },
      { date: '2026-02-15', views: 15400 },
      { date: '2026-02-16', views: 12300 },
      { date: '2026-02-17', views: 14200 },
      { date: '2026-02-18', views: 11200 },
      { date: '2026-02-19', views: 43000 },
    ],
    earningsOverTime: [
      { date: '2026-02-11', earnings: 520 },
      { date: '2026-02-12', earnings: 710 },
      { date: '2026-02-13', earnings: 680 },
      { date: '2026-02-14', earnings: 920 },
      { date: '2026-02-15', earnings: 1540 },
      { date: '2026-02-16', earnings: 1230 },
      { date: '2026-02-17', earnings: 1420 },
      { date: '2026-02-18', earnings: 1120 },
      { date: '2026-02-19', earnings: 1680 },
    ],
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white">Analytics</h1>
            <p className="text-gray-400 mt-2">Track your content performance and earnings</p>
          </div>

          {/* Period Selector */}
          <div className="flex gap-2">
            {(['day', 'week', 'month', 'year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  period === p
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Views"
            value={(analytics.totalViews / 1000).toFixed(0)}
            unit="K"
            trend="+12%"
            color="blue"
          />
          <StatCard
            title="Earnings"
            value={analytics.totalEarnings.toFixed(0)}
            unit="$"
            trend="+8%"
            color="green"
          />
          <StatCard
            title="New Subscribers"
            value={(analytics.newSubscribers / 100).toFixed(0)}
            unit="K"
            trend="+5%"
            color="purple"
          />
          <StatCard
            title="Avg Engagement"
            value={analytics.averageEngagement.toFixed(1)}
            unit="%"
            trend="+2%"
            color="pink"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <AnalyticsChart
            title="Views Over Time"
            data={analytics.viewsOverTime}
            dataKey="views"
            color="#8b5cf6"
          />
          <AnalyticsChart
            title="Earnings Over Time"
            data={analytics.earningsOverTime}
            dataKey="earnings"
            color="#ec4899"
          />
        </div>

        {/* Top Content */}
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Top Content</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analytics.topContent.map((content) => (
              <div
                key={content.id}
                className="bg-slate-900/50 rounded-lg border border-slate-600 p-4 hover:border-slate-500 transition-colors"
              >
                <div className="flex gap-4">
                  <Image
                    src={content.thumbnail}
                    alt={content.title}
                    width={96}
                    height={96}
                    className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold line-clamp-2 mb-2">
                      {content.title}
                    </h3>
                    <div className="flex gap-4 text-xs text-gray-400">
                      <div>👁️ {content.views.toLocaleString()}</div>
                      <div>❤️ {content.likes.toLocaleString()}</div>
                      <div>💬 {content.comments.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
