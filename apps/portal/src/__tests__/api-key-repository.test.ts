import { describe, it, expect } from "vitest";

import { ApiKeyRepository } from "@/dao/api-key.repository";
import type { ApiKeyCreateInput } from "@/dao/api-key.repository";

/**
 * Tests for ApiKeyRepository's document-ID behavior.
 *
 * The token must be the Firestore document ID — otherwise revoke/delete,
 * which address the doc via update(token)/delete(token), hit a non-existent
 * document and fail. We test documentId() directly via a subclass; the full
 * create() pipeline would need a Firestore mock (integration test).
 */

class TestableApiKeyRepository extends ApiKeyRepository {
  public testDocumentId(input: ApiKeyCreateInput) {
    // In the real pipeline, beforeCreate injects the token onto the input
    // before documentId() runs. documentId() just reads it back.
    return this.documentId(input, { projectId: "p", environmentId: "e" });
  }
}

const repo = new TestableApiKeyRepository(null as any, null);

describe("ApiKeyRepository: Document ID", () => {
  it("uses the token as the document ID", () => {
    const input = {
      label: "Prod",
      type: "client",
      token: "cid_abc123",
    } as unknown as ApiKeyCreateInput;
    expect(repo.testDocumentId(input)).toBe("cid_abc123");
  });

  it("uses the server token as the document ID", () => {
    const input = {
      label: "Backend",
      type: "server",
      token: "svr_xyz789",
    } as unknown as ApiKeyCreateInput;
    expect(repo.testDocumentId(input)).toBe("svr_xyz789");
  });

  it("returns a non-null ID so create() takes the keyed (not auto-ID) write path", () => {
    const input = {
      label: "",
      type: "client",
      token: "cid_keyed",
    } as unknown as ApiKeyCreateInput;
    expect(repo.testDocumentId(input)).not.toBeNull();
  });
});
