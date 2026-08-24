/**
 * Standardized response helpers for onRequest Cloud Functions.
 */

import type { ApiError } from "./errors";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Sends a successful JSON response with optional custom status code.
 */
export function sendSuccess<T>(res: any, data: T, statusCode = 200): void {
  res.status(statusCode).json(data);
}

/**
 * Sends an error JSON response from an ApiError instance.
 */
export function sendError(res: any, error: ApiError): void {
  res.status(error.statusCode).json({ error: { code: error.code, message: error.message } });
}

/**
 * Sets standard CDN cache headers.
 * @param res - The response object
 * @param maxAge - Client cache max-age in seconds (default: 30)
 * @param sMaxAge - CDN shared cache max-age in seconds (default: 60)
 */
export function setCdnCache(res: any, maxAge = 30, sMaxAge = 60): void {
  res.set("Cache-Control", `public, max-age=${maxAge}, s-maxage=${sMaxAge}`);
}

/**
 * Sets private (non-CDN-cacheable) cache headers.
 * @param res - The response object
 * @param maxAge - Client cache max-age in seconds (default: 30)
 */
export function setPrivateCache(res: any, maxAge = 30): void {
  res.set("Cache-Control", `private, max-age=${maxAge}`);
}

/* eslint-enable @typescript-eslint/no-explicit-any */
