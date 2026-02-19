const rateLimit = require('express-rate-limit');

const rateLimitMiddleware = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || 15000),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || 100),
  message: {
    success: false,
    message: 'Too many requests, please try again later',
  },
  skip: (req) => {
    // Skip rate limit for health checks
    return req.path === '/health';
  },
});

module.exports = rateLimitMiddleware;
