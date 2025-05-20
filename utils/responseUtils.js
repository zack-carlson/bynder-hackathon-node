/**
 * Response utilities for standardizing API responses
 */

/**
 * Creates a success response object
 * @param {*} data - The data to send in the response
 * @param {string} message - Optional success message
 * @param {Object} meta - Optional metadata (pagination, etc.)
 * @returns {Object} Formatted success response
 */
export const successResponse = (data, message = null, meta = null) => {
  const response = {
    success: true,
    timestamp: new Date().toISOString()
  };

  if (message) {
    response.message = message;
  }

  if (data !== undefined) {
    response.data = data;
  }

  if (meta) {
    // Add any metadata like pagination
    Object.assign(response, meta);
  }

  return response;
};

/**
 * Creates an error response object
 * @param {string} message - Error message
 * @param {string} code - Error code for the client
 * @param {number} statusCode - HTTP status code
 * @param {Object} details - Additional error details
 * @returns {Object} Formatted error response
 */
export const errorResponse = (message, code = 'INTERNAL_ERROR', statusCode = 500, details = null) => {
  const response = {
    success: false,
    error: {
      code,
      message
    },
    timestamp: new Date().toISOString()
  };

  if (details) {
    response.error.details = details;
  }

  // In development, include stack trace if available
  if (process.env.NODE_ENV !== 'production' && details && details.stack) {
    response.error.stack = details.stack;
  }

  return { response, statusCode };
};

/**
 * Helper for pagination metadata
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @returns {Object} Pagination metadata
 */
export const paginationMeta = (page, limit, total) => {
  return {
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Express middleware to handle not found routes
 */
export const notFoundHandler = (req, res) => {
  const { response, statusCode } = errorResponse(
    `Route ${req.method} ${req.url} not found`,
    'ROUTE_NOT_FOUND',
    404
  );
  res.status(statusCode).json(response);
};

/**
 * Express middleware for global error handling
 */
export const errorHandler = (err, req, res, next) => {
  console.error('ERROR:', err);
  
  // Use provided status code or default to 500
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected error occurred';
  
  const { response } = errorResponse(
    message,
    errorCode,
    statusCode,
    process.env.NODE_ENV !== 'production' ? { stack: err.stack } : null
  );
  
  res.status(statusCode).json(response);
};