import { z } from "zod";

/** A single config entry stored per environment */
export interface ConfigEntry {
  key: string;
  value: unknown;
  valueType: "string" | "number" | "boolean" | "json" | "array";
  version: string;
  publishedAt: string;
  updatedAt: string;
  updatedBy: string;
  locked?: boolean;
}

/** The set of supported value types */
export type ConfigValueType = ConfigEntry["valueType"];

/** Validation schema for config values (discriminated union by valueType) */
export const configValueSchema = z.discriminatedUnion("valueType", [
  z.object({ valueType: z.literal("string"), value: z.string() }),
  z.object({ valueType: z.literal("number"), value: z.number() }),
  z.object({ valueType: z.literal("boolean"), value: z.boolean() }),
  z.object({
    valueType: z.literal("json"),
    value: z.string().refine((v) => {
      try {
        JSON.parse(v);
        return true;
      } catch {
        return false;
      }
    }, "Invalid JSON"),
  }),
  z.object({
    valueType: z.literal("array"),
    value: z.string().refine((v) => {
      try {
        const p = JSON.parse(v);
        return Array.isArray(p);
      } catch {
        return false;
      }
    }, "Must be a valid JSON array"),
  }),
]);

/** Validation schema for config keys */
export const configKeySchema = z
  .string()
  .min(1, "Key is required")
  .max(100, "Key must be 100 characters or less")
  .regex(
    /^[a-zA-Z0-9._]+$/,
    "Only alphanumeric, dots, and underscores allowed",
  );

/** An environment within a project */
export interface Environment {
  id: string;
  name: string;
  projectId: string;
  allowedDomains: string[];
  color?: string;
  isProduction?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** An API key for SDK authentication */
export interface ApiKey {
  token: string;
  label: string;
  status: "active" | "revoked";
  createdBy: string;
  createdAt: string;
  revokedAt: string | null;
}

/** A project entity */
export interface Project {
  id: string;
  name: string;
  ownerId: string;
  description?: string;
  authorizedUsers: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
