const errorHandler = (err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;

  // Detailed error
  console.error({
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.body,
    errorMessage: err.message,
    errorCode: err.code,
    errorDetail: err.detail,
    errorHint: err.hint,
    stack: err.stack,
  });

  // Safe response
  const isClientError = statusCode >= 400 && statusCode < 500;
  res.status(statusCode).json({
    success: false,
    message: isClientError ? err.message : "An internal error occurred",
  });
};

module.exports = errorHandler;
