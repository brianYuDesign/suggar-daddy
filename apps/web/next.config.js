//@ts-check

const { composePlugins, withNx } = require('@nx/next');

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 */
const nextConfig = {
  nx: {},
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3008',
        pathname: '/uploads/**',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: false,
    tsconfigPath: './tsconfig.json',
  },
  async rewrites() {
    return [
      // Media routes bypass API Gateway (multipart/form-data binary issue)
      {
        source: '/api/media/:path*',
        destination: 'http://localhost:3008/api/media/:path*',
      },
      {
        source: '/api/upload/:path*',
        destination: 'http://localhost:3008/api/upload/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:3008/uploads/:path*',
      },
      // All other API routes go through API Gateway
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/api/:path*',
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve backend modules on client side
      config.resolve.alias = {
        ...config.resolve.alias,
        '@suggar-daddy/auth': false,
        '@nestjs/common': false,
        '@nestjs/core': false,
        '@nestjs/platform-express': false,
        '@nestjs/typeorm': false,
        '@nestjs/config': false,
        '@nestjs-modules/mailer': false,
        '@nestjs/schedule': false,
      };
    }
    // Exclude .node files from webpack processing
    config.module.rules.push({
      test: /\.node$/,
      use: 'node-loader',
    });
    return config;
  },
  transpilePackages: [],
};

const plugins = [withNx];

module.exports = composePlugins(...plugins)(nextConfig);
