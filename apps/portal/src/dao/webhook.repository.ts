import { collection, getDocs } from "firebase/firestore";

import { BaseRepository } from "./base-repository";
import type {
  AuditContext,
  AuthenticatedUser,
  RepositoryContext,
  ValidationError,
} from "./types";
import { RepositoryError } from "./types";

// ─── Entity Types ────────────────────────────────────────────

export interface WebhookEntity {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  format:
    "standard" | "slack" | "discord" | "google-chat" | "ms-teams" | "custom";
  eventTypes: string[];
  resourceCategories: string[];
  environments: string[];
  customTemplate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookCreateInput {
  name: string;
  url: string;
  format:
    "standard" | "slack" | "discord" | "google-chat" | "ms-teams" | "custom";
  eventTypes: string[];
  resourceCategories: string[];
  environments: string[];
  customTemplate?: string;
  [key: string]: unknown;
}

export interface WebhookUpdateInput {
  name?: string;
  url?: string;
  enabled?: boolean;
  format?:
    "standard" | "slack" | "discord" | "google-chat" | "ms-teams" | "custom";
  eventTypes?: string[];
  resourceCategories?: string[];
  environments?: string[];
  customTemplate?: string;
  [key: string]: unknown;
}

// ─── Constants ───────────────────────────────────────────────

const MAX_WEBHOOKS = 10;
const HTTPS_URL_PATTERN = /^https:\/\/.+/;

// ─── WebhookRepository ───────────────────────────────────────

export class WebhookRepository extends BaseRepository<
  WebhookEntity,
  WebhookCreateInput,
  WebhookUpdateInput
> {
  protected collectionPath(ctx: RepositoryContext): string {
    return `projects/${ctx.projectId}/webhooks`;
  }

  protected queryKeys(ctx: RepositoryContext): string[][] {
    return [
      ["webhooks", ctx.projectId],
      ["audit_log", ctx.projectId],
    ];
  }

  protected buildAuditContext(
    operation: "create" | "update" | "delete",
    ctx: RepositoryContext,
    input?: WebhookCreateInput | WebhookUpdateInput,
    oldEntity?: WebhookEntity | null,
    newEntity?: WebhookEntity,
  ): AuditContext {
    const name =
      (input as WebhookCreateInput)?.name ??
      oldEntity?.name ??
      newEntity?.name ??
      "unknown";
    return {
      actorId: "",
      action: operation,
      resourcePath: `webhooks/${name}`,
      oldValue: oldEntity ?? undefined,
      newValue: input ?? undefined,
    };
  }

  protected validate(
    input: WebhookCreateInput | WebhookUpdateInput,
    operation: "create" | "update",
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Name validation
    if (operation === "create" || "name" in input) {
      const name = (input as WebhookCreateInput).name;
      if (operation === "create" && (!name || name.trim().length === 0)) {
        errors.push({
          field: "name",
          message: "Name is required",
          code: "REQUIRED",
        });
      } else if (name !== undefined && name.trim().length === 0) {
        errors.push({
          field: "name",
          message: "Name cannot be empty",
          code: "REQUIRED",
        });
      }
    }

    // URL validation — must be valid HTTPS
    if (operation === "create" || "url" in input) {
      const url = (input as WebhookCreateInput).url;
      if (operation === "create" && !url) {
        errors.push({
          field: "url",
          message: "URL is required",
          code: "REQUIRED",
        });
      } else if (url !== undefined) {
        if (!HTTPS_URL_PATTERN.test(url)) {
          errors.push({
            field: "url",
            message: "URL must be a valid HTTPS URL",
            code: "INVALID_URL",
          });
        }
      }
    }

    return errors;
  }

  // ─── Lifecycle Hooks ─────────────────────────────────────────

  protected async beforeCreate(
    _input: WebhookCreateInput,
    ctx: RepositoryContext,
    _user: AuthenticatedUser,
  ): Promise<void> {
    // Enforce max 10 webhooks per project
    const colPath = this.collectionPath(ctx);
    const colRef = collection(this.firestore, colPath);
    const snapshot = await getDocs(colRef);
    if (snapshot.size >= MAX_WEBHOOKS) {
      throw new RepositoryError(
        `Maximum ${MAX_WEBHOOKS} webhooks per project`,
        "MAX_WEBHOOKS_REACHED",
      );
    }
  }
}
