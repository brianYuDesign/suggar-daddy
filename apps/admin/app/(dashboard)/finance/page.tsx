'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowPathIcon,
  CalendarIcon,
  ChartPieIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import RevenueChart, { RevenueDataPoint } from '@/components/admin/RevenueChart';
import TransactionStats, {
  TransactionStatsData,
} from '@/components/admin/TransactionStats';
import RefundAnalysis, {
  RefundAnalysisData,
} from '@/components/admin/RefundAnalysis';

// API 基礎 URL
const API_BASE_URL = process.env.NEXT_PUBLIC_PAYMENT_API_URL || 'http://localhost:3002';

type GroupByOption = 'day' | 'week' | 'month';

interface DateRange {
  startDate: string;
  endDate: string;
}

export default function AdminFinancePage() {
  const { t } = useTranslation('finance');
  // 日期範圍狀態
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  });

  // 分組方式
  const [groupBy, setGroupBy] = useState<GroupByOption>('day');

  // 數據狀態
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([]);
  const [transactionStats, setTransactionStats] = useState<TransactionStatsData | null>(null);
  const [refundAnalysis, setRefundAnalysis] = useState<RefundAnalysisData | null>(null);

  // 加載狀態
  const [loading, setLoading] = useState({
    revenue: false,
    transactions: false,
    refunds: false,
  });

  // 錯誤狀態
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // 獲取營收數據
  const fetchRevenueData = useCallback(async () => {
    setLoading((prev) => ({ ...prev, revenue: true }));
    setErrors((prev) => ({ ...prev, revenue: '' }));

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/payments/reports/revenue?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&groupBy=${groupBy}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch revenue data');
      }

      const result = await response.json();
      if (result.success) {
        setRevenueData(result.data);
      } else {
        throw new Error(result.message || 'Unknown error');
      }
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        revenue: error instanceof Error ? error.message : t('fetchRevenueFailed'),
      }));
      // 使用模擬數據
      setRevenueData(generateMockRevenueData(groupBy));
    } finally {
      setLoading((prev) => ({ ...prev, revenue: false }));
    }
  }, [dateRange.startDate, dateRange.endDate, groupBy]);

  // 獲取交易統計
  const fetchTransactionStats = useCallback(async () => {
    setLoading((prev) => ({ ...prev, transactions: true }));
    setErrors((prev) => ({ ...prev, transactions: '' }));

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/payments/reports/transactions?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch transaction stats');
      }

      const result = await response.json();
      if (result.success) {
        setTransactionStats(result.data);
      } else {
        throw new Error(result.message || 'Unknown error');
      }
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        transactions: error instanceof Error ? error.message : t('fetchTransactionsFailed'),
      }));
      // 使用模擬數據
      setTransactionStats(generateMockTransactionStats());
    } finally {
      setLoading((prev) => ({ ...prev, transactions: false }));
    }
  }, [dateRange.startDate, dateRange.endDate]);

  // 獲取退款分析
  const fetchRefundAnalysis = useCallback(async () => {
    setLoading((prev) => ({ ...prev, refunds: true }));
    setErrors((prev) => ({ ...prev, refunds: '' }));

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/payments/reports/refunds?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch refund analysis');
      }

      const result = await response.json();
      if (result.success) {
        setRefundAnalysis(result.data);
      } else {
        throw new Error(result.message || 'Unknown error');
      }
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        refunds: error instanceof Error ? error.message : t('fetchRefundsFailed'),
      }));
      // 使用模擬數據
      setRefundAnalysis(generateMockRefundAnalysis());
    } finally {
      setLoading((prev) => ({ ...prev, refunds: false }));
    }
  }, [dateRange.startDate, dateRange.endDate]);

  // 刷新所有數據
  const refreshAllData = useCallback(() => {
    fetchRevenueData();
    fetchTransactionStats();
    fetchRefundAnalysis();
  }, [fetchRevenueData, fetchTransactionStats, fetchRefundAnalysis]);

  // 初始加載
  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // 預設日期範圍快捷按鈕
  const setPresetRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setDateRange({
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-7xl mx-auto">
        {/* 標題區域 */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <ChartPieIcon className="w-8 h-8 text-purple-500" />
              {t('title')}
            </h1>
            <p className="text-gray-400 mt-2">{t('subtitle')}</p>
          </div>

          {/* 刷新按鈕 */}
          <button
            onClick={refreshAllData}
            disabled={Object.values(loading).some(Boolean)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <ArrowPathIcon className={`w-5 h-5 ${Object.values(loading).some(Boolean) ? 'animate-spin' : ''}`} />
            {t('refreshData')}
          </button>
        </div>

        {/* 日期範圍選擇器 */}
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex items-center gap-2 text-gray-400">
              <CalendarIcon className="w-5 h-5" />
              <span className="text-sm font-medium">{t('dateRange')}</span>
            </div>

            {/* 快捷按鈕 */}
            <div className="flex flex-wrap gap-2">
              {[7, 30, 90, 365].map((days) => (
                <button
                  key={days}
                  onClick={() => setPresetRange(days)}
                  className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-md transition-colors"
                >
                  {days === 365 ? t('year1') : t('days', { count: days })}
                </button>
              ))}
            </div>

            {/* 自定義日期輸入 */}
            <div className="flex items-center gap-3 flex-1 lg:justify-end">
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, startDate: e.target.value }))
                }
                className="bg-slate-900 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
              />
              <span className="text-gray-500">{t('to')}</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, endDate: e.target.value }))
                }
                className="bg-slate-900 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        {/* 交易統計卡片 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <BanknotesIcon className="w-6 h-6 text-emerald-400" />
            {t('transactionOverview')}
          </h2>
          <TransactionStats
            data={transactionStats}
            loading={loading.transactions}
          />
        </div>

        {/* 圖表區域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 營收趨勢圖 */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <ArrowTrendingUpIcon className="w-6 h-6 text-blue-400" />
              {t('revenueTrend')}
            </h2>
            {errors.revenue && (
              <div className="mb-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-yellow-400 text-sm">
                {errors.revenue} {t('showingMockData')}
              </div>
            )}
            <RevenueChart
              data={revenueData}
              groupBy={groupBy}
              onGroupByChange={setGroupBy}
              loading={loading.revenue}
            />
          </div>

          {/* 退款分析 */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <ArrowPathIcon className="w-6 h-6 text-red-400" />
              {t('refundAnalysis')}
            </h2>
            {errors.refunds && (
              <div className="mb-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-yellow-400 text-sm">
                {errors.refunds} {t('showingMockData')}
              </div>
            )}
            <RefundAnalysis
              data={refundAnalysis}
              loading={loading.refunds}
            />
          </div>
        </div>

        {/* 頁尾 */}
        <div className="text-center text-gray-500 text-sm pt-8 border-t border-slate-700">
          <p>{t('footer.lastUpdated', { time: new Date().toLocaleString() })}</p>
          <p className="mt-1">{t('footer.copyright')}</p>
        </div>
      </div>
    </div>
  );
}

// 模擬數據生成函數
function generateMockRevenueData(groupBy: GroupByOption): RevenueDataPoint[] {
  const data: RevenueDataPoint[] = [];
  const days = groupBy === 'day' ? 30 : groupBy === 'week' ? 12 : 12;
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    if (groupBy === 'day') {
      date.setDate(date.getDate() - i);
    } else if (groupBy === 'week') {
      date.setDate(date.getDate() - i * 7);
    } else {
      date.setMonth(date.getMonth() - i);
    }

    const revenue = Math.floor(Math.random() * 5000) + 3000;
    const transactionCount = Math.floor(Math.random() * 50) + 20;
    const prevRevenue = data.length > 0 ? data[data.length - 1].revenue : revenue;
    const growthRate = ((revenue - prevRevenue) / prevRevenue) * 100;

    data.push({
      date: date.toISOString().split('T')[0].slice(0, groupBy === 'month' ? 7 : 10),
      revenue,
      transactionCount,
      growthRate: Math.round(growthRate * 100) / 100,
    });
  }

  return data;
}

function generateMockTransactionStats(): TransactionStatsData {
  return {
    totalRevenue: 158420.5,
    totalTransactions: 1256,
    successfulRate: 94.5,
    averageAmount: 126.15,
    byPaymentMethod: [
      { method: 'credit_card', count: 680, amount: 85420 },
      { method: 'digital_wallet', count: 420, amount: 52300 },
      { method: 'debit_card', count: 156, amount: 20700.5 },
    ],
  };
}

function generateMockRefundAnalysis(): RefundAnalysisData {
  return {
    totalRefunds: 42,
    refundAmount: 5280,
    refundRate: 3.3,
    byReason: [
      { reason: '用戶要求', count: 18 },
      { reason: '產品問題', count: 12 },
      { reason: '重複付款', count: 8 },
      { reason: '未授權交易', count: 4 },
    ],
  };
}
