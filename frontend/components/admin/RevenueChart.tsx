'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  transactionCount: number;
  growthRate: number;
}

interface RevenueChartProps {
  data: RevenueDataPoint[];
  groupBy: 'day' | 'week' | 'month';
  onGroupByChange: (groupBy: 'day' | 'week' | 'month') => void;
  loading?: boolean;
}

export default function RevenueChart({
  data,
  groupBy,
  onGroupByChange,
  loading = false,
}: RevenueChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    
    switch (groupBy) {
      case 'day':
        return dateStr.slice(5); // MM-DD
      case 'week':
        return `W${dateStr.split('-')[1]}`;
      case 'month':
        return dateStr;
      default:
        return dateStr;
    }
  };

  interface TooltipPayload {
    value: number;
    payload: {
      transactionCount: number;
      growthRate: number;
    };
  }

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
          <p className="text-gray-300 text-sm mb-2">{label}</p>
          <p className="text-emerald-400 font-semibold">
            營收: {formatCurrency(payload[0].value)}
          </p>
          <p className="text-blue-400 text-sm">
            交易數: {payload[0].payload.transactionCount}
          </p>
          {payload[0].payload.growthRate !== 0 && (
            <p className={`text-sm ${payload[0].payload.growthRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              環比: {payload[0].payload.growthRate >= 0 ? '+' : ''}{payload[0].payload.growthRate.toFixed(1)}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">營收趨勢</h3>
          <GroupBySelector groupBy={groupBy} onChange={onGroupByChange} />
        </div>
        <div className="h-80 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">營收趨勢</h3>
          <GroupBySelector groupBy={groupBy} onChange={onGroupByChange} />
        </div>
        <div className="h-80 flex items-center justify-center text-gray-400">
          暫無數據
        </div>
      </div>
    );
  }

  // 計算統計數據
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const avgRevenue = totalRevenue / data.length;
  const maxRevenue = Math.max(...data.map(item => item.revenue));
  const totalTransactions = data.reduce((sum, item) => sum + item.transactionCount, 0);

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h3 className="text-lg font-semibold text-white">營收趨勢</h3>
        <GroupBySelector groupBy={groupBy} onChange={onGroupByChange} />
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="總營收"
          value={formatCurrency(totalRevenue)}
          color="emerald"
        />
        <StatCard
          label="平均營收"
          value={formatCurrency(avgRevenue)}
          color="blue"
        />
        <StatCard
          label="最高營收"
          value={formatCurrency(maxRevenue)}
          color="purple"
        />
        <StatCard
          label="總交易數"
          value={totalTransactions.toLocaleString()}
          color="yellow"
        />
      </div>

      {/* 圖表 */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="date" 
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={formatDate}
              stroke="#4b5563"
            />
            <YAxis
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={(value: number) => `$${(value / 1000).toFixed(0)}k`}
              stroke="#4b5563"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value: string) => <span className="text-gray-300">{value}</span>}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              name="營收"
              stroke="#10b981"
              fillOpacity={1}
              fill="url(#colorRevenue)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface GroupBySelectorProps {
  groupBy: 'day' | 'week' | 'month';
  onChange: (groupBy: 'day' | 'week' | 'month') => void;
}

function GroupBySelector({ groupBy, onChange }: GroupBySelectorProps) {
  const options: { value: 'day' | 'week' | 'month'; label: string }[] = [
    { value: 'day', label: '日' },
    { value: 'week', label: '週' },
    { value: 'month', label: '月' },
  ];

  return (
    <div className="flex bg-slate-900 rounded-lg p-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            groupBy === option.value
              ? 'bg-purple-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  color: 'emerald' | 'blue' | 'purple' | 'yellow' | 'red';
}

function StatCard({ label, value, color }: StatCardProps) {
  const colorClasses = {
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    yellow: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    red: 'bg-red-500/10 border-red-500/20 text-red-400',
  };

  return (
    <div className={`rounded-lg border p-3 ${colorClasses[color]}`}>
      <p className="text-xs opacity-80 mb-1">{label}</p>
      <p className="text-lg font-bold truncate">{value}</p>
    </div>
  );
}
