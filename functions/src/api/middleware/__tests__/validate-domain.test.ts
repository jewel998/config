import type { Firestore } from "firebase-admin/firestore";
import { describe, it, expect } from "vitest";

import { ForbiddenError } from "../../../utils/errors";
import { validateDomain } from "../../middleware/validate-domain";

/**
 * Build a minimal Firestore stub whose environment doc returns the given
 * allowedDomains. `exists` is true unless allowedDomains is null.
 */
function makeDb(allowedDomains: string[] | null): Firestore {
  const data = allowedDomains === null ? undefined : { allowedDomains };
  const docRef = {
    get: async () => ({ exists: allowedDomains !== null, data: () => data }),
  };
  const collection = () => ({
    doc: () => ({
      collection: () => ({ doc: () => docRef }),
    }),
  });
  return { collection } as unknown as Firestore;
}

describe("validateDomain", () => {
  it("allows an empty origin (no Origin/Referer header)", async () => {
    await expect(validateDomain(makeDb(["example.com"]), "p", "e", "")).resolves.toBeUndefined();
  });

  it("rejects localhost when it is not in the allowlist", async () => {
    const db = makeDb(["example.com"]);
    await expect(validateDomain(db, "p", "e", "http://localhost:3000")).rejects.toThrow(
      ForbiddenError,
    );
  });

  it("allows localhost when it is explicitly allowlisted", async () => {
    const db = makeDb(["localhost", "example.com"]);
    await expect(validateDomain(db, "p", "e", "http://localhost:3000")).resolves.toBeUndefined();
    await expect(validateDomain(db, "p", "e", "https://example.com")).resolves.toBeUndefined();
  });

  it("allows 127.0.0.1 only when explicitly allowlisted", async () => {
    await expect(
      validateDomain(makeDb(["127.0.0.1"]), "p", "e", "http://127.0.0.1:5173"),
    ).resolves.toBeUndefined();
    await expect(
      validateDomain(makeDb(["example.com"]), "p", "e", "http://127.0.0.1:5173"),
    ).rejects.toThrow(ForbiddenError);
  });

  it("allows all origins when allowedDomains is empty", async () => {
    await expect(
      validateDomain(makeDb([]), "p", "e", "https://anything.com"),
    ).resolves.toBeUndefined();
  });

  it("allows an exact allowlisted domain", async () => {
    await expect(
      validateDomain(makeDb(["example.com"]), "p", "e", "https://example.com"),
    ).resolves.toBeUndefined();
  });

  it("allows a subdomain of an allowlisted domain", async () => {
    await expect(
      validateDomain(makeDb(["example.com"]), "p", "e", "https://app.example.com"),
    ).resolves.toBeUndefined();
  });

  it("rejects a non-allowlisted origin", async () => {
    await expect(
      validateDomain(makeDb(["example.com"]), "p", "e", "https://evil.com"),
    ).rejects.toThrow(ForbiddenError);
  });

  it("allows when the environment doc does not exist", async () => {
    await expect(
      validateDomain(makeDb(null), "p", "e", "https://whatever.com"),
    ).resolves.toBeUndefined();
  });

  it("ignores a malformed origin instead of hard-failing", async () => {
    await expect(
      validateDomain(makeDb(["example.com"]), "p", "e", "not-a-url"),
    ).resolves.toBeUndefined();
  });
});
