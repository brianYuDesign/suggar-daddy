'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseAutoRetryOptions {
  /** 最大自動重試次數，默認為 3 */
  maxRetries?: number;
  /** 初始重試延遲（毫秒），默認為 1000ms */
  initialDelay?: number;
  /** 是否使用指數退避，默認為 true */
  exponentialBackoff?: boolean;
  /** 當發生錯誤時自動重試，默認為 true */
  autoRetry?: boolean;
  /** 錯誤回調 */
  onError?: (error: unknown, retryCount: number) => void;
  /** 重試回調 */
  onRetry?: (retryCount: number) => void;
  /** 達到最大重試次數回調 */
  onMaxRetriesReached?: () => void;
}

export interface UseAutoRetryReturn<T> {
  /** 當前數據 */
  data: T | null;
  /** 錯誤信息 */
  error: unknown | null;
  /** 是否正在加載 */
  isLoading: boolean;
  /** 當前重試次數 */
  retryCount: number;
  /** 是否正在重試 */
  isRetrying: boolean;
  /** 手動重試 */
  retry: () => void;
  /** 手動刷新（重置重試計數器） */
  refresh: () => void;
  /** 重置所有狀態 */
  reset: () => void;
}

/**
 * 自動重試 Hook - 在請求失敗時自動重試
 * 
 * @example
 * ```tsx
 * const { data, error, isLoading, retry } = useAutoRetry(
 *   async () => {
 *     const response = await fetch('/api/posts');
 *     if (!response.ok) throw new Error('Failed');
 *     return response.json();
 *   },
 *   { maxRetries: 3, exponentialBackoff: true }
 * );
 * ```
 */
export function useAutoRetry<T>(
  asyncFn: () => Promise<T>,
  options: UseAutoRetryOptions = {}
): UseAutoRetryReturn<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    exponentialBackoff = true,
    autoRetry = true,
    onError,
    onRetry,
    onMaxRetriesReached,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isMountedRef = useRef(true);

  // 計算延遲時間（指數退避）
  const getDelay = useCallback((count: number): number => {
    if (!exponentialBackoff) return initialDelay;
    return initialDelay * Math.pow(2, count);
  }, [exponentialBackoff, initialDelay]);

  // 執行異步函數
  const execute = useCallback(async (isManual = false) => {
    if (!isMountedRef.current) return;

    // 手動刷新時重置重試計數器
    if (isManual) {
      setRetryCount(0);
      setIsRetrying(false);
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await asyncFn();
      if (isMountedRef.current) {
        setData(result);
        setError(null);
        setRetryCount(0); // 成功後重置
        setIsRetrying(false);
      }
    } catch (err) {
      if (!isMountedRef.current) return;

      setError(err);
      onError?.(err, retryCount);

      // 自動重試邏輯
      if (autoRetry && retryCount < maxRetries) {
        setIsRetrying(true);
        const delay = getDelay(retryCount);
        
        onRetry?.(retryCount + 1);

        timeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setRetryCount(prev => prev + 1);
            execute();
          }
        }, delay);
      } else if (retryCount >= maxRetries) {
        setIsRetrying(false);
        onMaxRetriesReached?.();
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [asyncFn, autoRetry, maxRetries, retryCount, getDelay, onError, onRetry, onMaxRetriesReached]);

  // 手動重試（不增加計數器）
  const retry = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    execute();
  }, [execute]);

  // 手動刷新（重置計數器）
  const refresh = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    execute(true);
  }, [execute]);

  // 重置所有狀態
  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setData(null);
    setError(null);
    setIsLoading(false);
    setRetryCount(0);
    setIsRetrying(false);
  }, []);

  // 組件掛載時執行
  useEffect(() => {
    isMountedRef.current = true;
    execute(true);

    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 僅在掛載時執行

  return {
    data,
    error,
    isLoading,
    retryCount,
    isRetrying,
    retry,
    refresh,
    reset,
  };
}

/**
 * 簡化版的 useAutoRetry - 僅用於數據獲取
 * 
 * @example
 * ```tsx
 * const { data, error, isLoading } = useFetch('/api/posts');
 * ```
 */
export function useFetch<T>(
  url: string,
  options?: RequestInit & { retryOptions?: UseAutoRetryOptions }
) {
  const { retryOptions, ...fetchOptions } = options || {};

  return useAutoRetry<T>(
    async () => {
      const response = await fetch(url, fetchOptions);
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      return response.json();
    },
    retryOptions
  );
}
