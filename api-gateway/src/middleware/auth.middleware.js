const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // Skip auth for public endpoints
  const publicEndpoints = [
    '/api/v1/auth/register',
    '/api/v1/auth/login',
    '/health',
  ];

  if (publicEndpoints.includes(req.path)) {
    return next();
  }

  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No authorization token provided',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: error.message,
    });
  }
};

module.exports = authMiddleware;
