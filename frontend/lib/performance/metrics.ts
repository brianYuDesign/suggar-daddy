// lib/performance/metrics.ts
// Web Vitals 和性能監控

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte

  // 其他重要指標
  pageLoadTime?: number;
  resourcesCount?: number;
  resourcesSize?: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};
  private startTime: number = typeof performance !== 'undefined' ? performance.now() : 0;

  /**
   * 初始化性能監控
   */
  public init() {
    if (typeof window === 'undefined' || typeof performance === 'undefined') return;

    // 監控頁面加載時間
    window.addEventListener('load', () => {
      this.recordPageLoadTime();
      this.analyzeResources();
    });

    // 使用 PerformanceObserver 監控 Core Web Vitals
    if ('PerformanceObserver' in window) {
      this.observeMetrics();
    }
  }

  /**
   * 觀察性能指標
   */
  private observeMetrics() {
    try {
      // 觀察最大內容繪製 (LCP)
      const lcpObserver = new (window as any).PerformanceObserver((list: any) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric('lcp', lastEntry.renderTime || lastEntry.loadTime);
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      // 觀察首次輸入延遲 (FID)
      const fidObserver = new (window as any).PerformanceObserver((list: any) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.recordMetric('fid', entry.processingDuration);
        });
      });
      fidObserver.observe({ type: 'first-input', buffered: true });

      // 觀察累積版面移位 (CLS)
      let clsValue = 0;
      const clsObserver = new (window as any).PerformanceObserver((list: any) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            this.recordMetric('cls', clsValue);
          }
        });
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });

      // 觀察首個內容繪製 (FCP)
      const fcpObserver = new (window as any).PerformanceObserver((list: any) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric('fcp', lastEntry.startTime);
      });
      fcpObserver.observe({ type: 'paint', buffered: true });
    } catch (error) {
      console.error('Failed to initialize performance observers:', error);
    }
  }

  /**
   * 記錄頁面加載時間
   */
  private recordPageLoadTime() {
    if (typeof performance === 'undefined') return;
    
    const perfData = (performance as any).timing;
    if (perfData) {
      const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
      this.recordMetric('pageLoadTime', pageLoadTime);
    }
  }

  /**
   * 記錄性能指標
   */
  private recordMetric(name: keyof PerformanceMetrics, value: number) {
    this.metrics[name] = value;
    
    // 發送到分析服務
    this.sendMetric(name as string, value);
    
    // 控制台輸出 (開發)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name}: ${value.toFixed(2)}ms`);
    }
  }

  /**
   * 分析資源使用
   */
  private analyzeResources() {
    if (typeof performance === 'undefined') return;

    const perfData = performance.getEntriesByType('resource');
    const totalSize = perfData.reduce((sum, entry: any) => sum + (entry.transferSize || 0), 0);
    
    this.metrics.resourcesCount = perfData.length;
    this.metrics.resourcesSize = totalSize;

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] Resources: ${perfData.length} files, ${(totalSize / 1024).toFixed(2)}KB`);
    }
  }

  /**
   * 發送指標到分析服務
   */
  private sendMetric(name: string, value: number) {
    // 可以集成到 Google Analytics、Datadog 等
    try {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon?.(`/api/metrics`, JSON.stringify({ name, value }));
      }
    } catch (error) {
      console.error('Failed to send metric:', error);
    }
  }

  /**
   * 獲取所有指標
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * 檢查是否符合目標標準
   */
  public validateTargets(): {
    lcp: boolean;
    fid: boolean;
    cls: boolean;
    overall: boolean;
  } {
    return {
      lcp: (this.metrics.lcp || 0) <= 2500, // 2.5s
      fid: (this.metrics.fid || 0) <= 100, // 100ms
      cls: (this.metrics.cls || 0) <= 0.1, // 0.1
      overall: 
        (this.metrics.lcp || 0) <= 2500 &&
        (this.metrics.fid || 0) <= 100 &&
        (this.metrics.cls || 0) <= 0.1,
    };
  }
}

export const performanceMonitor = new PerformanceMonitor();
