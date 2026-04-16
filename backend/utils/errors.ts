/**
 * Custom API Error Classes
 * Type-safe error handling for consistent API responses
 */

/**
 * Base API Error class with enhanced typing
 */
export class APIError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: unknown;
  public readonly timestamp: string;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'API_ERROR',
    details: unknown = null
  ) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, APIError);
    }
  }

  toJSON(): {
    success: false;
    message: string;
    code: string;
    statusCode: number;
    details: unknown;
    timestamp: string;
  } {
    return {
      success: false,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Validation Error (400)
 * Used when request validation fails
 */
export class ValidationError extends APIError {
  public readonly errors: Array<{ field: string; message: string }>;

  constructor(message: string, errors: Array<{ field: string; message: string }> = []) {
    super(message, 400, 'VALIDATION_ERROR', errors);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/**
 * Authentication Error (401)
 * Used when authentication is required or fails
 */
export class AuthenticationError extends APIError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization Error (403)
 * Used when user lacks permission for the requested resource
 */
export class AuthorizationError extends APIError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

/**
 * Forbidden Error (403)
 * Used when user is authenticated but not allowed to perform the action
 */
export class ForbiddenError extends APIError {
  constructor(message: string = 'Access forbidden') {
    super(message, 403, 'FORBIDDEN_ERROR');
    this.name = 'ForbiddenError';
  }
}

/**
 * Not Found Error (404)
 * Used when requested resource doesn't exist
 */
export class NotFoundError extends APIError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict Error (409)
 * Used when request conflicts with current state (e.g., duplicate entry)
 */
export class ConflictError extends APIError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT_ERROR');
    this.name = 'ConflictError';
  }
}

/**
 * Bad Request Error (400)
 * Generic client error
 */
export class BadRequestError extends APIError {
  constructor(message: string = 'Bad request') {
    super(message, 400, 'BAD_REQUEST');
    this.name = 'BadRequestError';
  }
}

/**
 * Internal Server Error (500)
 * Generic server error
 */
export class InternalServerError extends APIError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, 'INTERNAL_SERVER_ERROR');
    this.name = 'InternalServerError';
  }
}

/**
 * Service Unavailable Error (503)
 * Used when external service is unavailable
 */
export class ServiceUnavailableError extends APIError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
    this.name = 'ServiceUnavailableError';
  }
}
