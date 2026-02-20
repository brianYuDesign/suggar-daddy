const morgan = require('morgan');

const loggingMiddleware = morgan((tokens, req, res) => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] ${tokens.method(req, res)} ${tokens.url(req, res)} ${tokens.status(req, res)} - ${tokens.res(req, res, 'content-length')} bytes`;
});

module.exports = loggingMiddleware;
