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
    errorCode: err.code,           // PostgreSQL error code (e.g. "23503" = FK violation)
    errorDetail: err.detail,       // PostgreSQL error detail
    errorHint: err.hint,           // PostgreSQL hint
    stack: err.stack
  });

  // Safe response
  const isClientError = statusCode >= 400 && statusCode < 500;
  res.status(statusCode).json({
    success: false,
    message: isClientError
      ? err.message                        // show specific message for 400s (bad input)
      : "An internal error occurred"       // hide 500 internal server errors
  });
};

module.exports = errorHandler;
