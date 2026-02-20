'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardStats, Activity } from '@/types/admin';

// Mock data - replace with actual API calls
const mockStats: DashboardStats = {
  totalUsers: 15234,
  totalContent: 8932,
  todayRevenue: 5840.50,
  pendingReviews: 23,
  userGrowth: '+12%',
  contentGrowth: '+8%',
  revenueGrowth: '+15%',
};

const mockActivities: Activity[] = [
  {
    id: '1',
    type: 'user_signup',
    description: 'New user registered',
    userName: 'John Doe',
    timestamp: '2026-02-20T14:30:00Z',
  },
  {
    id: '2',
    type: 'content_published',
    description: 'Content approved and published',
    userName: 'Jane Smith',
    timestamp: '2026-02-20T13:15:00Z',
  },
  {
    id: '3',
    type: 'payment_received',
    description: 'Subscription payment received',
    userName: 'Mike Johnson',
    timestamp: '2026-02-20T12:45:00Z',
  },
  {
    id: '4',
    type: 'content_reported',
    description: 'Content reported for review',
    userName: 'Sarah Wilson',
    timestamp: '2026-02-20T11:20:00Z',
  },
  {
    id: '5',
    type: 'user_suspended',
    description: 'User account suspended',
    userName: 'Tom Brown',
    timestamp: '2026-02-20T10:00:00Z',
  },
];

const activityIcons: Record<string, string> = {
  user_signup: '👤',
  content_published: '📝',
  payment_received: '💰',
  content_reported: '⚠️',
  user_suspended: '🚫',
};

const activityColors: Record<string, string> = {
  user_signup: 'bg-blue-500/20 text-blue-400',
  content_published: 'bg-green-500/20 text-green-400',
  payment_received: 'bg-purple-500/20 text-purple-400',
  content_reported: 'bg-yellow-500/20 text-yellow-400',
  user_suspended: 'bg-red-500/20 text-red-400',
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(mockStats);
  const [activities, setActivities] = useState<Activity[]>(mockActivities);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API calls
    const fetchData = async () => {
      setIsLoading(true);
      // Replace with actual API calls:
      // const statsRes = await fetch('/api/admin/stats');
      // const activitiesRes = await fetch('/api/admin/activities');
      // const statsData = await statsRes.json();
      // const activitiesData = await activitiesRes.json();
      
      await new Promise((resolve) => setTimeout(resolve, 800));
      setStats(mockStats);
      setActivities(mockActivities);
      setIsLoading(false);
    };

    fetchData();
  }, []);

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      trend: stats.userGrowth,
      icon: '👥',
      color: 'from-blue-500 to-blue-600',
      link: '/admin/users',
    },
    {
      title: 'Total Content',
      value: stats.totalContent.toLocaleString(),
      trend: stats.contentGrowth,
      icon: '📝',
      color: 'from-purple-500 to-purple-600',
      link: '/admin/content',
    },
    {
      title: "Today's Revenue",
      value: `$${stats.todayRevenue.toLocaleString()}`,
      trend: stats.revenueGrowth,
      icon: '💰',
      color: 'from-green-500 to-green-600',
      link: '/admin/finance',
    },
    {
      title: 'Pending Reviews',
      value: stats.pendingReviews.toString(),
      trend: 'Requires attention',
      icon: '⚠️',
      color: 'from-pink-500 to-pink-600',
      link: '/admin/content',
    },
  ];

  if (isLoading) {
    return (
      <div className="p-4 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-slate-700 rounded w-1/4"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-800 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard Overview</h1>
          <p className="text-gray-400 mt-1">Welcome back! Here's what's happening today.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <Link
              key={stat.title}
              href={stat.link}
              className={`bg-gradient-to-br ${stat.color} rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium">{stat.title}</p>
                  <p className="text-3xl font-bold mt-2">{stat.value}</p>
                  <p className="text-white/70 text-sm mt-1">{stat.trend}</p>
                </div>
                <span className="text-4xl">{stat.icon}</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/content"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
            >
              <span>⚠️</span>
              Review Pending Content
              {stats.pendingReviews > 0 && (
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">
                  {stats.pendingReviews}
                </span>
              )}
            </Link>
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
            >
              <span>👤</span>
              Manage Users
            </Link>
            <Link
              href="/admin/finance"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
            >
              <span>📊</span>
              View Reports
            </Link>
            <Link
              href="/admin/settings"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
            >
              <span>⚙️</span>
              Platform Settings
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Recent Activity</h2>
            <button className="text-purple-400 hover:text-purple-300 text-sm font-medium">
              View All
            </button>
          </div>
          <div className="space-y-4">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${activityColors[activity.type]}`}>
                  {activityIcons[activity.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{activity.description}</p>
                  {activity.userName && (
                    <p className="text-gray-400 text-sm">by {activity.userName}</p>
                  )}
                </div>
                <span className="text-gray-500 text-sm whitespace-nowrap">
                  {formatTimeAgo(activity.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
