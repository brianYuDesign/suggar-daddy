'use client';

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { ExclamationTriangleIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';

export interface RefundReason {
  reason: string;
  count: number;
}

export interface RefundAnalysisData {
  totalRefunds: number;
  refundAmount: number;
  refundRate: number;
  byReason: RefundReason[];
}

interface RefundAnalysisProps {
  data: RefundAnalysisData | null;
  loading?: boolean;
}

// 預設顏色
const COLORS = ['#ef4444', '#f97316', '#eab308', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function RefundAnalysis({
  data,
  loading = false,
}: RefundAnalysisProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
          <h3 className="text-lg font-semibold text-white">退款分析</h3>
        </div>
        <div className="h-80 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
          <h3 className="text-lg font-semibold text-white">退款分析</h3>
        </div>
        <div className="h-80 flex items-center justify-center text-gray-400">
          暫無數據
        </div>
      </div>
    );
  }

  // 計算健康度
  const getHealthStatus = (rate: number) => {
    if (rate <= 2) return { label: '健康', color: 'emerald' };
    if (rate <= 5) return { label: '注意', color: 'yellow' };
    return { label: '警告', color: 'red' };
  };

  const health = getHealthStatus(data.refundRate);

  // 為圓餅圖準備數據
  const pieData = data.byReason.map((item, index) => ({
    name: item.reason,
    value: item.count,
    color: COLORS[index % COLORS.length],
  }));

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const total = data.byReason.reduce((sum, item) => sum + item.count, 0);
      const percentage = ((payload[0].value / total) * 100).toFixed(1);
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
          <p className="text-gray-300 text-sm">{payload[0].name}</p>
          <p className="text-white font-semibold">
            {payload[0].value} 筆 ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">退款分析</h3>
          <p className="text-gray-400 text-sm">退款統計與原因分析</p>
        </div>
      </div>

      {/* 關鍵指標 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-900/50 rounded-lg border border-slate-600 p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowTrendingDownIcon className="w-4 h-4 text-red-400" />
            <span className="text-gray-400 text-sm">退款筆數</span>
          </div>
          <p className="text-2xl font-bold text-white">{data.totalRefunds.toLocaleString()}</p>
        </div>
        <div className="bg-slate-900/50 rounded-lg border border-slate-600 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-400 text-sm font-medium">$</span>
            <span className="text-gray-400 text-sm">退款金額</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(data.refundAmount)}</p>
        </div>
        <div className={`rounded-lg border p-4 ${
          health.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/20' :
          health.color === 'yellow' ? 'bg-yellow-500/10 border-yellow-500/20' :
          'bg-red-500/10 border-red-500/20'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">退款率</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              health.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400' :
              health.color === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {health.label}
            </span>
          </div>
          <p className={`text-2xl font-bold ${
            health.color === 'emerald' ? 'text-emerald-400' :
            health.color === 'yellow' ? 'text-yellow-400' :
            'text-red-400'
          }`}>
            {data.refundRate.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* 退款原因分佈 */}
      {pieData.length > 0 && (
        <div className="mb-6">
          <h4 className="text-white font-medium mb-4">退款原因分佈</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend 
                  verticalAlign="middle" 
                  align="right"
                  layout="vertical"
                  formatter={(value: string) => (
                    <span className="text-gray-300 text-sm">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 退款原因詳情列表 */}
      <div>
        <h4 className="text-white font-medium mb-4">退款原因詳情</h4>
        <div className="space-y-3">
          {data.byReason.map((item, index) => {
            const total = data.byReason.reduce((sum, r) => sum + r.count, 0);
            const percentage = (item.count / total) * 100;
            
            return (
              <div key={index} className="flex items-center gap-4">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                ></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-300 text-sm truncate">{item.reason}</span>
                    <span className="text-gray-400 text-sm ml-2">{percentage.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: COLORS[index % COLORS.length],
                      }}
                    ></div>
                  </div>
                </div>
                <span className="text-white font-medium text-sm w-12 text-right">
                  {item.count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 建議 */}
      {data.refundRate > 5 && (
        <div className="mt-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-medium text-sm">退款率偏高</p>
              <p className="text-gray-400 text-sm mt-1">
                當前退款率為 {data.refundRate.toFixed(2)}%，建議檢查產品品質或優化用戶體驗流程。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
