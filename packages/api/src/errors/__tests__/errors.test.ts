import { describe, it, expect } from "vitest";
import {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  MethodNotAllowedError,
  PayloadTooLargeError,
  TooManyRequestsError,
  InternalError,
} from "../index";

describe("ApiError", () => {
  it("stores statusCode, code, and message", () => {
    const err = new ApiError(418, "TEAPOT", "I'm a teapot");
    expect(err.statusCode).toBe(418);
    expect(err.code).toBe("TEAPOT");
    expect(err.message).toBe("I'm a teapot");
    expect(err.name).toBe("ApiError");
    expect(err).toBeInstanceOf(Error);
  });
});

describe("HTTP error subclasses", () => {
  it("BadRequestError → 400", () => {
    const err = new BadRequestError("bad");
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("BAD_REQUEST");
    expect(err).toBeInstanceOf(ApiError);
  });

  it("UnauthorizedError → 401", () => {
    const err = new UnauthorizedError("nope");
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe("UNAUTHORIZED");
  });

  it("ForbiddenError → 403", () => {
    const err = new ForbiddenError("denied");
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe("FORBIDDEN");
  });

  it("NotFoundError → 404", () => {
    const err = new NotFoundError("missing");
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
  });

  it("MethodNotAllowedError → 405", () => {
    const err = new MethodNotAllowedError("no POST");
    expect(err.statusCode).toBe(405);
    expect(err.code).toBe("METHOD_NOT_ALLOWED");
  });

  it("PayloadTooLargeError → 413", () => {
    const err = new PayloadTooLargeError("too big");
    expect(err.statusCode).toBe(413);
    expect(err.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("TooManyRequestsError → 429 with retryAfter", () => {
    const err = new TooManyRequestsError("slow down", 30);
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe("TOO_MANY_REQUESTS");
    expect(err.retryAfter).toBe(30);
  });

  it("TooManyRequestsError → 429 without retryAfter", () => {
    const err = new TooManyRequestsError("slow down");
    expect(err.retryAfter).toBeUndefined();
  });

  it("InternalError → 500", () => {
    const err = new InternalError("oops");
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe("INTERNAL_ERROR");
  });
});
