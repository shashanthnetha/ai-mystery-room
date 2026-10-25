export class ApiError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    if (errors) this.errors = errors;
  }

  static badRequest(message, errors) {
    return new ApiError(400, message, errors);
  }
  static notFound(message) {
    return new ApiError(404, message);
  }
  static conflict(message) {
    return new ApiError(409, message);
  }
}

/** 404 for unmatched routes — returns JSON, not the default HTML page. */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `No route matches ${req.method} ${req.originalUrl}`,
  });
}

/** Central error handler — every thrown error becomes a JSON envelope. */
export function errorHandler(err, req, res, _next) {
  if (err instanceof ApiError) {
    return res
      .status(err.status)
      .json({ success: false, message: err.message, ...(err.errors ? { errors: err.errors } : {}) });
  }

  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Request body must be valid JSON.' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(400).json({ success: false, message: 'Request body is too large.' });
  }

  console.error('[unhandled error]', err);
  return res.status(500).json({
    success: false,
    message: 'Something went wrong at HQ. Please try again.',
  });
}

/** Express 5 forwards rejected route-handler promises here automatically. */
