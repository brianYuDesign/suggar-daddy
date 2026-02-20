const express = require('express');
const httpProxy = require('http-proxy');

const router = express.Router();

// Create proxies for each service
const createProxyHandler = (target) => {
  const proxy = httpProxy.createProxyServer({
    target,
    changeOrigin: true,
    proxyTimeout: 30000,
    timeout: 30000,
  });

  proxy.on('error', (err, req, res) => {
    console.error(`Proxy error for ${target}:`, err.message);
    res.status(503).json({
      success: false,
      message: 'Service unavailable',
      service: target,
      error: err.message,
    });
  });

  return proxy;
};

const authServiceProxy = createProxyHandler(
  process.env.AUTH_SERVICE_URL || 'http://localhost:3001'
);
const contentServiceProxy = createProxyHandler(
  process.env.CONTENT_STREAMING_SERVICE_URL || 'http://localhost:3001'
);
const recommendationServiceProxy = createProxyHandler(
  process.env.RECOMMENDATION_SERVICE_URL || 'http://localhost:3000'
);
const paymentServiceProxy = createProxyHandler(
  process.env.PAYMENT_SERVICE_URL || 'http://localhost:3002'
);
const subscriptionServiceProxy = createProxyHandler(
  process.env.SUBSCRIPTION_SERVICE_URL || 'http://localhost:3003'
);

// Auth Service Routes
router.use('/auth', (req, res, next) => {
  authServiceProxy.web(req, res, { target: process.env.AUTH_SERVICE_URL || 'http://localhost:3001' });
});

// Content Streaming Service Routes
router.use('/videos', (req, res, next) => {
  contentServiceProxy.web(req, res, { target: process.env.CONTENT_STREAMING_SERVICE_URL || 'http://localhost:3001' });
});

// Recommendation Service Routes
router.use('/recommendations', (req, res, next) => {
  recommendationServiceProxy.web(req, res, { target: process.env.RECOMMENDATION_SERVICE_URL || 'http://localhost:3000' });
});

// Payment Service Routes
router.use('/payments', (req, res, next) => {
  paymentServiceProxy.web(req, res, { target: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3002' });
});

// Subscription Service Routes
router.use('/subscriptions', (req, res, next) => {
  subscriptionServiceProxy.web(req, res, { target: process.env.SUBSCRIPTION_SERVICE_URL || 'http://localhost:3003' });
});

module.exports = router;
