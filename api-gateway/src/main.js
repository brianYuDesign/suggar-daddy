const express = require('express');
const httpProxy = require('http-proxy');
const cors = require('cors');
const dotenv = require('dotenv');
const authMiddleware = require('./middleware/auth.middleware');
const loggingMiddleware = require('./middleware/logging.middleware');
const rateLimitMiddleware = require('./middleware/rateLimit.middleware');
const errorHandler = require('./middleware/errorHandler.middleware');
const proxyRoutes = require('./routes/proxy.routes');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(loggingMiddleware);
app.use(rateLimitMiddleware);

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'API Gateway',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api', proxyRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path,
  });
});

// Error Handler
app.use(errorHandler);

const PORT = process.env.GATEWAY_PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ API Gateway running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
