import { ApiError } from "./api-error";

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

export class PayloadTooLargeError extends ApiError {
  constructor(message: string) {
    super(413, "PAYLOAD_TOO_LARGE", message);
  }
}

export class TooManyRequestsError extends ApiError {
  public readonly retryAfter?: number;

  constructor(message: string, retryAfter?: number) {
    super(429, "TOO_MANY_REQUESTS", message);
    this.retryAfter = retryAfter;
  }
}

export class InternalError extends ApiError {
  constructor(message: string) {
    super(500, "INTERNAL_ERROR", message);
  }
}
