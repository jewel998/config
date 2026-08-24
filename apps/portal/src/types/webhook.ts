export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  eventTypes: string[];
  resourceCategories: string[];
  environments: string[];
  format: "standard" | "slack" | "discord" | "google-chat" | "ms-teams" | "custom";
  createdAt: string;
  updatedAt: string;
  customTemplate?: string;
}

export interface WebhookDelivery {
  id: string;
  timestamp: string;
  httpStatus: number | null;
  success: boolean;
  duration: number;
  error: string | null;
  auditEntryId: string;
  isTest: boolean;
}
