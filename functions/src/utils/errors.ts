/**
 * Standardized API error classes and error handling wrapper for onRequest handlers.
 */

import type { Request } from "firebase-functions/v2/https";

/**
 * Base API error with HTTP status code and machine-readable error code.
 */
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string) {
    super(400, "BAD_REQUEST", message);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string) {
    super(401, "UNAUTHORIZED", message);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string) {
    super(403, "FORBIDDEN", message);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string) {
    super(404, "NOT_FOUND", message);
  }
}

export class MethodNotAllowedError extends ApiError {
  constructor(message: string) {
    super(405, "METHOD_NOT_ALLOWED", message);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string) {
    super(409, "CONFLICT", message);
  }
}

export class PayloadTooLargeError extends ApiError {
  constructor(message: string) {
    super(413, "PAYLOAD_TOO_LARGE", message);
  }
}

export class TooManyRequestsError extends ApiError {
  constructor(message: string) {
    super(429, "TOO_MANY_REQUESTS", message);
  }
}

export class InternalError extends ApiError {
  constructor(message: string) {
    super(500, "INTERNAL_ERROR", message);
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Res = { status(code: number): any; json(body: unknown): any };
type RequestHandler = (req: Request, res: Res) => Promise<void>;
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Wraps an onRequest handler with standardized error handling.
 * Catches ApiError instances and returns proper HTTP status codes.
 * Unrecognized errors are logged and returned as 500.
 *
 * Usage:
 * ```ts
 * export const myFn = onRequest(
 *   { cors: true },
 *   withErrorHandler(async (req, res) => { ... })
 * );
 * ```
 */
export function withErrorHandler(
  handler: (req: Request, res: any) => Promise<void>,
): (req: Request, res: any) => Promise<void> {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      if (error instanceof ApiError) {
        res
          .status(error.statusCode)
          .json({ error: { code: error.code, message: error.message } });
      } else {
        console.error("Unhandled error:", error);
        res.status(500).json({
          error: {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred",
          },
        });
      }
    }
  };
}
