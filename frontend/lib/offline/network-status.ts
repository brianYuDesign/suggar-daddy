// lib/offline/network-status.ts
// 網絡狀態監控和離線支持

export interface NetworkStatus {
  online: boolean;
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
  downlink: number; // Mbps
  rtt: number; // ms
  saveData: boolean;
}

class NetworkMonitor {
  private listeners: Set<(status: NetworkStatus) => void> = new Set();
  private status: NetworkStatus = {
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
    saveData: false,
  };

  constructor() {
    if (typeof window === 'undefined') return;

    // 監控在線/離線事件
    window.addEventListener('online', () => this.updateStatus());
    window.addEventListener('offline', () => this.updateStatus());

    // 初始化
    this.updateStatus();
  }

  /**
   * 更新網絡狀態
   */
  private updateStatus() {
    if (typeof navigator === 'undefined') return;

    const connection = (navigator as any).connection || (navigator as any).mozConnection;
    
    this.status = {
      online: navigator.onLine,
      effectiveType: connection?.effectiveType || '4g',
      downlink: connection?.downlink || 10,
      rtt: connection?.rtt || 50,
      saveData: (navigator as any).connection?.saveData || false,
    };

    // 通知所有監聽器
    this.listeners.forEach((listener) => listener(this.status));
  }

  /**
   * 訂閱網絡狀態變化
   */
  public subscribe(listener: (status: NetworkStatus) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 獲取當前網絡狀態
   */
  public getStatus(): NetworkStatus {
    return { ...this.status };
  }

  /**
   * 檢查是否在線
   */
  public isOnline(): boolean {
    return this.status.online;
  }

  /**
   * 檢查是否是慢網絡
   */
  public isSlowNetwork(): boolean {
    return ['slow-2g', '2g', '3g'].includes(this.status.effectiveType);
  }

  /**
   * 應該優化數據使用嗎?
   */
  public shouldOptimizeData(): boolean {
    return this.status.saveData || this.isSlowNetwork();
  }
}

export const networkMonitor = new NetworkMonitor();

/**
 * React Hook: 監控網絡狀態
 */
export const useNetworkStatus = () => {
  const [status, setStatus] = React.useState<NetworkStatus>(
    networkMonitor.getStatus()
  );

  React.useEffect(() => {
    const unsubscribe = networkMonitor.subscribe(setStatus);
    return () => {
      unsubscribe();
    };
  }, []);

  return status;
};

// 需要導入 React
import React from 'react';
