/**
 * Request validation helpers for onRequest Cloud Functions.
 */

import type { Request } from "firebase-functions/v2/https";
import { BadRequestError, MethodNotAllowedError } from "./errors.js";

/**
 * Asserts the request uses one of the allowed HTTP methods.
 * Throws MethodNotAllowedError if the method doesn't match.
 */
export function assertMethod(req: Request, ...methods: string[]): void {
  if (!methods.includes(req.method)) {
    throw new MethodNotAllowedError(
      `Method ${req.method} not allowed. Use ${methods.join(", ")}`,
    );
  }
}

/**
 * Extracts a required string parameter from the given source object.
 * Throws BadRequestError if the parameter is missing or not a string.
 */
export function requireParam(
  source: Record<string, unknown>,
  key: string,
): string {
  const value = source[key];
  if (!value || typeof value !== "string") {
    throw new BadRequestError(`${key} is required`);
  }
  return value;
}

/**
 * Extracts an optional string parameter from the given source object.
 * Returns undefined if the parameter is missing or not a string.
 */
export function optionalParam(
  source: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = source[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") return undefined;
  return value;
}
