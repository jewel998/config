/** API paths used by the SDK transport. */
export const API_ENDPOINTS = {
  config: "v1/config",
  version: "v1/version",
} as const;

/** Shared HTTP values used by browser and server transports. */
export const HTTP_CONSTANTS = {
  jsonContentType: "application/json",
  jsonAccept: "application/json",
  etagHeader: "ETag",
  ifNoneMatchHeader: "If-None-Match",
} as const;
