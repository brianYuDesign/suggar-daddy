'use client';

import { useState, useRef, useEffect, ReactElement } from 'react';
import { cn } from './utils';

export interface TooltipProps {
  /** Tooltip 內容 */
  content: React.ReactNode;
  /** 子元素（觸發器） */
  children: ReactElement;
  /** 位置，默認為 'top' */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** 延遲顯示時間（毫秒），默認為 200ms */
  delay?: number;
  /** 是否禁用 Tooltip */
  disabled?: boolean;
  /** 自定義類名 */
  className?: string;
}

export function Tooltip({
  content,
  children,
  position = 'top',
  delay = 200,
  disabled = false,
  className,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    if (disabled || !content) return;
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // 位置相關的類名
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  // 箭頭位置類名
  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-900',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-900',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-900',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-900',
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {isVisible && !disabled && content && (
        <div
          ref={tooltipRef}
          id="tooltip"
          role="tooltip"
          className={cn(
            'absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-md shadow-lg',
            'animate-in fade-in-0 zoom-in-95',
            'max-w-xs whitespace-nowrap pointer-events-none',
            positionClasses[position],
            className
          )}
        >
          {content}
          {/* 箭頭 */}
          <div
            className={cn(
              'absolute w-0 h-0 border-4',
              arrowClasses[position]
            )}
          />
        </div>
      )}
    </div>
  );
}

/** 
 * 簡化版的 Tooltip，直接使用 title 屬性
 * 適用於簡單文字提示
 */
export function SimpleTooltip({
  title,
  children,
}: {
  title: string;
  children: ReactElement;
}) {
  return (
    <div title={title} aria-label={title}>
      {children}
    </div>
  );
}
