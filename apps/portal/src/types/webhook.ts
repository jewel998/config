export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  eventTypes: string[];
  resourceCategories: string[];
  environments: string[];
  format: "standard" | "slack";
  createdAt: string;
  updatedAt: string;
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
