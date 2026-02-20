'use client';

import React from 'react';
import {
  CreditCardIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

export interface PaymentMethodStats {
  method: string;
  count: number;
  amount: number;
}

export interface TransactionStatsData {
  totalRevenue: number;
  totalTransactions: number;
  successfulRate: number;
  averageAmount: number;
  byPaymentMethod: PaymentMethodStats[];
}

interface TransactionStatsProps {
  data: TransactionStatsData | null;
  loading?: boolean;
}

export default function TransactionStats({
  data,
  loading = false,
}: TransactionStatsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      credit_card: '信用卡',
      debit_card: '借記卡',
      bank_transfer: '銀行轉帳',
      digital_wallet: '數位錢包',
      unknown: '其他',
    };
    return labels[method] || method;
  };

  const getPaymentMethodIcon = (method: string) => {
    // 使用統一的圖標
    return <CreditCardIcon className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-slate-800/50 rounded-lg border border-slate-700 p-6 animate-pulse">
            <div className="h-10 w-10 bg-slate-700 rounded-lg mb-4"></div>
            <div className="h-6 bg-slate-700 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-slate-700 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
            <div className="h-10 w-10 bg-slate-700/50 rounded-lg mb-4 flex items-center justify-center text-gray-500">
              <ChartBarIcon className="w-5 h-5" />
            </div>
            <p className="text-gray-400 text-sm">暫無數據</p>
          </div>
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: '總營收',
      value: formatCurrency(data.totalRevenue),
      subtext: `${data.totalTransactions.toLocaleString()} 筆交易`,
      icon: BanknotesIcon,
      color: 'emerald' as const,
      trend: null,
    },
    {
      label: '總交易數',
      value: data.totalTransactions.toLocaleString(),
      subtext: `成功率 ${data.successfulRate.toFixed(1)}%`,
      icon: CreditCardIcon,
      color: 'blue' as const,
      trend: null,
    },
    {
      label: '平均交易金額',
      value: formatCurrency(data.averageAmount),
      subtext: '每筆交易',
      icon: ChartBarIcon,
      color: 'purple' as const,
      trend: null,
    },
    {
      label: '成功率',
      value: `${data.successfulRate.toFixed(1)}%`,
      subtext: '交易完成率',
      icon: CheckCircleIcon,
      color: data.successfulRate >= 90 ? ('emerald' as const) : data.successfulRate >= 70 ? ('yellow' as const) : ('red' as const),
      trend: null,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 主要統計卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* 支付方式分佈 */}
      {data.byPaymentMethod.length > 0 && (
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
          <h4 className="text-white font-semibold mb-4">支付方式分佈</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.byPaymentMethod.map((method, index) => (
              <div
                key={index}
                className="bg-slate-900/50 rounded-lg border border-slate-600 p-4 hover:border-slate-500 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    index === 0 ? 'bg-purple-500/20 text-purple-400' :
                    index === 1 ? 'bg-blue-500/20 text-blue-400' :
                    index === 2 ? 'bg-emerald-500/20 text-emerald-400' :
                    'bg-orange-500/20 text-orange-400'
                  }`}>
                    {getPaymentMethodIcon(method.method)}
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">
                      {getPaymentMethodLabel(method.method)}
                    </p>
                    <p className="text-gray-400 text-xs">
                      {method.count.toLocaleString()} 筆
                    </p>
                  </div>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-bold text-white">
                    {formatCurrency(method.amount)}
                  </span>
                  <span className="text-xs text-gray-400">
                    {((method.amount / data.totalRevenue) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      index === 0 ? 'bg-purple-500' :
                      index === 1 ? 'bg-blue-500' :
                      index === 2 ? 'bg-emerald-500' :
                      'bg-orange-500'
                    }`}
                    style={{ width: `${(method.amount / data.totalRevenue) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  subtext: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'emerald' | 'blue' | 'purple' | 'yellow' | 'red';
  trend: string | null;
}

function StatCard({ label, value, subtext, icon: Icon, color, trend }: StatCardProps) {
  const colorClasses = {
    emerald: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      text: 'text-emerald-400',
      iconBg: 'bg-emerald-500/20',
    },
    blue: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      text: 'text-blue-400',
      iconBg: 'bg-blue-500/20',
    },
    purple: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      text: 'text-purple-400',
      iconBg: 'bg-purple-500/20',
    },
    yellow: {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      text: 'text-yellow-400',
      iconBg: 'bg-yellow-500/20',
    },
    red: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      text: 'text-red-400',
      iconBg: 'bg-red-500/20',
    },
  };

  const colors = colorClasses[color];

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-lg p-6`}>
      <div className={`${colors.iconBg} ${colors.text} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-gray-400 text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      <div className="flex items-center gap-2">
        <p className="text-gray-400 text-xs">{subtext}</p>
        {trend && (
          <span className={`text-xs font-medium ${trend.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}
