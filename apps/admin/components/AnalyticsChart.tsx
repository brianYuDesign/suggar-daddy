'use client';

import React from 'react';

interface ChartDataPoint {
  date: string;
  [key: string]: string | number;
}

interface AnalyticsChartProps {
  title: string;
  data: ChartDataPoint[];
  dataKey: string;
  color: string;
}

export default function AnalyticsChart({
  title,
  data,
  dataKey,
  color,
}: AnalyticsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6 sm:p-8">
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        <div className="h-40 flex items-center justify-center text-gray-400">
          No data available
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => (d[dataKey] as number) || 0));
  const minValue = 0;
  const range = maxValue - minValue;

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6 sm:p-8">
      <h3 className="text-lg font-semibold text-white mb-6">{title}</h3>

      <div className="flex flex-col gap-6">
        {/* Simple Bar Chart */}
        <div className="space-y-3">
          {data.map((point, index) => {
            const value = (point[dataKey] as number) || 0;
            const percentage = range === 0 ? 0 : ((value - minValue) / range) * 100;

            return (
              <div key={index} className="flex items-center gap-3">
                <div className="w-12 text-right text-xs text-gray-400 flex-shrink-0">
                  {point.date.split('-').slice(1).join('-')}
                </div>
                <div className="flex-1 h-6 bg-slate-900/50 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: color,
                      opacity: 0.8,
                    }}
                  ></div>
                </div>
                <div className="w-16 text-right text-sm font-semibold text-white flex-shrink-0">
                  {dataKey === 'earnings' && '$'}
                  {(value / 1000).toFixed(1)}
                  {dataKey === 'earnings' ? '' : 'K'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-700">
          <div className="text-center">
            <div className="text-xs text-gray-400">Total</div>
            <div className="text-lg font-bold text-white">
              {dataKey === 'earnings' && '$'}
              {(data.reduce((sum, d) => sum + ((d[dataKey] as number) || 0), 0) / 1000).toFixed(1)}
              {dataKey === 'earnings' ? '' : 'K'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400">Average</div>
            <div className="text-lg font-bold text-white">
              {dataKey === 'earnings' && '$'}
              {(data.reduce((sum, d) => sum + ((d[dataKey] as number) || 0), 0) / data.length / 1000).toFixed(1)}
              {dataKey === 'earnings' ? '' : 'K'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400">Peak</div>
            <div className="text-lg font-bold text-white">
              {dataKey === 'earnings' && '$'}
              {(Math.max(...data.map((d) => (d[dataKey] as number) || 0)) / 1000).toFixed(1)}
              {dataKey === 'earnings' ? '' : 'K'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
