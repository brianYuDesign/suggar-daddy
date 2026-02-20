'use client';

import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: string;
  color?: 'blue' | 'green' | 'purple' | 'pink';
}

const colorMap = {
  blue: 'from-blue-500 to-blue-600',
  green: 'from-green-500 to-green-600',
  purple: 'from-purple-500 to-purple-600',
  pink: 'from-pink-500 to-pink-600',
};

export default function StatCard({
  title,
  value,
  unit = '',
  trend,
  color = 'blue',
}: StatCardProps) {
  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} rounded-lg p-4 sm:p-6 text-white shadow-lg hover:shadow-xl transition-shadow`}>
      <div className="text-gray-100 text-xs sm:text-sm font-medium mb-2">{title}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl sm:text-3xl font-bold">{value}</span>
        {unit && <span className="text-sm sm:text-base text-gray-200">{unit}</span>}
      </div>
      {trend && (
        <div className="text-xs sm:text-sm text-gray-200 mt-2">
          <span className="text-green-200">{trend}</span>
        </div>
      )}
    </div>
  );
}
