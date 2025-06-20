/**
 * Base error class for all Nutrient DWS client errors.
 * Provides consistent error handling across the library.
 */
export class NutrientError extends Error {
  /**
   * Error code for programmatic error handling
   */
  public readonly code: string;

  /**
   * Additional error details
   */
  public readonly details?: Record<string, unknown>;

  /**
   * HTTP status code if the error originated from an HTTP response
   */
  public readonly statusCode?: number;

  constructor(
    message: string,
    code: string = 'NUTRIENT_ERROR',
    details?: Record<string, unknown>,
    statusCode?: number,
  ) {
    super(message);
    this.name = 'NutrientError';
    this.code = code;
    this.details = details;
    this.statusCode = statusCode;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NutrientError);
    }
  }

  /**
   * Returns a JSON representation of the error
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      statusCode: this.statusCode,
      stack: this.stack,
    };
  }

  /**
   * Returns a string representation of the error
   */
  toString(): string {
    let result = `${this.name}: ${this.message}`;
    if (this.code !== 'NUTRIENT_ERROR') {
      result += ` (${this.code})`;
    }
    if (this.statusCode) {
      result += ` [HTTP ${this.statusCode}]`;
    }
    return result;
  }
}

/**
 * Error thrown when input validation fails
 */
export class ValidationError extends NutrientError {
  constructor(message: string, details?: Record<string, unknown>, statusCode?: number) {
    super(message, 'VALIDATION_ERROR', details, statusCode);
    this.name = 'ValidationError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }
}

/**
 * Error thrown when API requests fail
 */
export class APIError extends NutrientError {
  constructor(message: string, statusCode: number, details?: Record<string, unknown>) {
    super(message, 'API_ERROR', details, statusCode);
    this.name = 'APIError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, APIError);
    }
  }
}

/**
 * Error thrown when authentication fails
 */
export class AuthenticationError extends NutrientError {
  constructor(message: string, details?: Record<string, unknown>, statusCode: number = 401) {
    super(message, 'AUTHENTICATION_ERROR', details, statusCode);
    this.name = 'AuthenticationError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthenticationError);
    }
  }
}

/**
 * Error thrown when network requests fail
 */
export class NetworkError extends NutrientError {
  constructor(message: string, details?: Record<string, unknown>, statusCode?: number) {
    super(message, 'NETWORK_ERROR', details, statusCode);
    this.name = 'NetworkError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NetworkError);
    }
  }
}
