// next.config.js - 優化版本
// 性能、圖片、代碼分割優化配置

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const config = {
  // React strict mode
  reactStrictMode: true,

  // 使用 SWC 進行編譯和縮小化
  swcMinify: true,

  // 實驗性功能
  experimental: {
    // 優化包大小
    optimizePackageImports: [
      '@headlessui/react',
      '@heroicons/react',
      'lodash-es',
    ],
  },

  // 圖片優化
  images: {
    // 使用 AVIF 和 WebP 格式
    formats: ['image/avif', 'image/webp'],
    // 允許外部圖片
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    // 圖片緩存優化
    cacheControl: 'public, max-age=31536000, immutable',
    // 響應式圖片斷點
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // 最大化響應式加載
    minimumCacheTTL: 60000, // 1 分鐘
  },

  // 代碼分割策略
  webpack: (config, { isServer }) => {
    // 優化分割策略
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        runtimeChunk: 'single',
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // React 和 React DOM (最大)
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'vendor-react',
              priority: 50,
              reuseExistingChunk: true,
              enforce: true,
            },
            // UI 庫
            ui: {
              test: /[\\/]node_modules[\\/](@headlessui|@heroicons)[\\/]/,
              name: 'vendor-ui',
              priority: 40,
              reuseExistingChunk: true,
            },
            // Redux 和狀態管理
            redux: {
              test: /[\\/]node_modules[\\/](@reduxjs|redux|redux-persist)[\\/]/,
              name: 'vendor-redux',
              priority: 35,
              reuseExistingChunk: true,
            },
            // 其他 vendor 代碼
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendor-common',
              priority: 10,
              reuseExistingChunk: true,
            },
            // 共用代碼
            common: {
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    return config;
  },

  // 壓縮和優化
  compress: true,
  poweredByHeader: false,

  // 響應頭優化
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=10, stale-while-revalidate=59',
          },
        ],
      },
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // 重定向和重寫
  async redirects() {
    return [];
  },

  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/:path*`,
        },
      ],
    };
  },

  // 環境變數
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },

  // TypeScript 配置
  typescript: {
    // 不要在生產構建中失敗
    ignoreBuildErrors: false,
  },

  // ESLint 配置
  eslint: {
    // 這在開發期間很有用，但生產環境可以禁用
    ignoreDuringBuilds: false,
  },
};

// 應用 Bundle Analyzer (如果已安裝)
module.exports = withBundleAnalyzer(config);
