'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './button/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** 自定義錯誤 UI */
  fallback?: (error: Error, resetError: () => void) => ReactNode;
  /** 錯誤回調 */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** 是否顯示錯誤詳情（開發模式） */
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * 錯誤邊界組件
 * 捕獲子組件樹中的 JavaScript 錯誤，顯示友好的錯誤 UI
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 記錄錯誤到錯誤報告服務
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    this.setState({
      errorInfo,
    });

    // 調用自定義錯誤處理
    this.props.onError?.(error, errorInfo);
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleRefresh = () => {
    this.resetError();
    window.location.reload();
  };

  handleGoHome = () => {
    this.resetError();
    window.location.href = '/';
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, showDetails } = this.props;

    if (hasError && error) {
      // 使用自定義 fallback
      if (fallback) {
        return fallback(error, this.resetError);
      }

      // 默認錯誤 UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="rounded-full bg-red-100 p-3">
                  <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
                </div>
                <div>
                  <CardTitle className="text-xl">頁面出現錯誤</CardTitle>
                  <CardDescription className="mt-1">
                    抱歉，頁面發生了意外錯誤
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                我們已經記錄了這個問題，技術團隊會盡快處理。您可以嘗試刷新頁面或返回首頁。
              </p>

              {/* 開發模式顯示錯誤詳情 */}
              {showDetails && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                    查看錯誤詳情
                  </summary>
                  <div className="mt-3 p-4 bg-gray-50 rounded-md border border-gray-200 overflow-auto">
                    <p className="text-xs font-mono text-red-600 mb-2">
                      <strong>錯誤訊息：</strong>
                      <br />
                      {error.message}
                    </p>
                    {error.stack && (
                      <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap">
                        {error.stack}
                      </pre>
                    )}
                    {errorInfo && (
                      <div className="mt-3">
                        <p className="text-xs font-mono text-gray-600 mb-1">
                          <strong>組件堆疊：</strong>
                        </p>
                        <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </CardContent>

            <CardFooter className="flex gap-3">
              <Button
                onClick={this.handleRefresh}
                variant="default"
                className="flex-1"
              >
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                刷新頁面
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="flex-1"
              >
                <Home className="mr-2 h-4 w-4" aria-hidden="true" />
                返回首頁
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return children;
  }
}

/**
 * 函數式組件包裝器（使用 React Hook）
 */
export function ErrorBoundaryWrapper(props: ErrorBoundaryProps) {
  return <ErrorBoundary {...props} />;
}
