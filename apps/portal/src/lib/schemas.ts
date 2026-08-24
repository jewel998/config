import { z } from "zod";

// Targeting rule validation
export const predicateSchema = z.object({
  attribute: z.string().min(1).max(128),
  operator: z.enum([
    "equals",
    "not_equals",
    "contains",
    "starts_with",
    "ends_with",
    "in_list",
    "not_in_list",
    "greater_than",
    "less_than",
    "regex_match",
    "in_segment",
    "not_in_segment",
  ]),
  value: z.union([z.string().max(1024), z.number(), z.boolean(), z.array(z.string())]),
});

export const predicateGroupSchema = z.object({
  predicates: z.array(predicateSchema).min(1).max(10),
});

export const targetingRuleSchema = z.object({
  id: z.string().min(1),
  priority: z.number().int().min(1).max(1000),
  value: z.unknown(),
  conditions: z.array(predicateGroupSchema).min(1).max(10),
});

// Segment validation
export const segmentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).default(""),
  conditions: z.array(predicateGroupSchema).max(20),
});

// Schedule validation
export const scheduleSchema = z.object({
  targetValue: z.unknown(),
  activateAt: z.string().refine((val) => {
    const ms = Date.parse(val);
    return !isNaN(ms) && ms > Date.now() + 60_000;
  }, "Activation time must be at least 1 minute in the future"),
});

// PII detection patterns
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_REGEX = /(\+?\d{1,4}[\s.-]?)?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,9}/;
const GOV_ID_REGEX = /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/; // SSN-like

export function detectPII(value: string): { hasPII: boolean; patterns: string[] } {
  const patterns: string[] = [];
  if (EMAIL_REGEX.test(value)) patterns.push("email");
  if (PHONE_REGEX.test(value)) patterns.push("phone");
  if (GOV_ID_REGEX.test(value)) patterns.push("government_id");
  return { hasPII: patterns.length > 0, patterns };
}

// Override value type validation
export function validateOverrideType(
  value: unknown,
  expectedType: "string" | "number" | "boolean" | "json" | "array",
): boolean {
  switch (expectedType) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number";
    case "boolean":
      return typeof value === "boolean";
    case "json": {
      if (typeof value !== "string") return false;
      try {
        JSON.parse(value);
        return true;
      } catch {
        return false;
      }
    }
    case "array": {
      if (typeof value !== "string") return false;
      try {
        const p = JSON.parse(value);
        return Array.isArray(p);
      } catch {
        return false;
      }
    }
    default:
      return false;
  }
}
