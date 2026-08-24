import { t } from "@lingui/core/macro";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { useMemo } from "react";
import { toast } from "sonner";

import {
  WebhookRepository,
  type WebhookCreateInput,
  type WebhookUpdateInput,
} from "@/dao/webhook.repository";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/stores/auth-store";

// ─── Generated Hooks ──────────────────────────────────────────

export const useCreateWebhook = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const repo = useMemo(() => new WebhookRepository(db, queryClient), [queryClient]);

  return useMutation({
    mutationFn: async (params: {
      projectId: string;
      name: string;
      url: string;
      format: "standard" | "slack" | "discord" | "google-chat" | "ms-teams" | "custom";
      eventTypes: string[];
      resourceCategories: string[];
      environments: string[];
      customTemplate?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const ctx = { projectId: params.projectId };
      const authUser = { uid: user.uid, email: user.email };
      const input: WebhookCreateInput = {
        name: params.name,
        url: params.url,
        format: params.format,
        eventTypes: params.eventTypes,
        resourceCategories: params.resourceCategories,
        environments: params.environments,
        ...(params.customTemplate ? { customTemplate: params.customTemplate } : {}),
      };
      await repo.create(input, ctx, authUser);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["webhooks", variables.projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["audit_log", variables.projectId],
      });
      toast.success(t`Webhook created`);
    },
    onError: () => {
      toast.error(t`Failed to create webhook`);
    },
  });
};

export const useUpdateWebhook = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const repo = useMemo(() => new WebhookRepository(db, queryClient), [queryClient]);

  return useMutation({
    mutationFn: async (params: {
      projectId: string;
      webhookId: string;
      data: Partial<{
        name: string;
        url: string;
        enabled: boolean;
        format: "standard" | "slack" | "discord" | "google-chat" | "ms-teams" | "custom";
        eventTypes: string[];
        resourceCategories: string[];
        environments: string[];
        customTemplate: string;
      }>;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const ctx = { projectId: params.projectId };
      const authUser = { uid: user.uid, email: user.email };
      const input: WebhookUpdateInput = { ...params.data };
      await repo.update(params.webhookId, input, ctx, authUser);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["webhooks", variables.projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["audit_log", variables.projectId],
      });
      toast.success(t`Webhook updated`);
    },
    onError: () => {
      toast.error(t`Failed to update webhook`);
    },
  });
};

export const useDeleteWebhook = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const repo = useMemo(() => new WebhookRepository(db, queryClient), [queryClient]);

  return useMutation({
    mutationFn: async (params: { projectId: string; webhookId: string }) => {
      if (!user) throw new Error("Not authenticated");
      // Delete deliveries subcollection first
      const deliveriesRef = collection(
        db,
        "projects",
        params.projectId,
        "webhooks",
        params.webhookId,
        "deliveries",
      );
      const deliveries = await getDocs(deliveriesRef);
      await Promise.all(deliveries.docs.map((d) => deleteDoc(d.ref)));

      // Delete webhook via repository pipeline
      const ctx = { projectId: params.projectId };
      const authUser = { uid: user.uid, email: user.email };
      await repo.delete(params.webhookId, ctx, authUser);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["webhooks", variables.projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["audit_log", variables.projectId],
      });
      toast.success(t`Webhook deleted`);
    },
    onError: () => {
      toast.error(t`Failed to delete webhook`);
    },
  });
};

export const useToggleWebhook = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const repo = useMemo(() => new WebhookRepository(db, queryClient), [queryClient]);

  return useMutation({
    mutationFn: async (params: { projectId: string; webhookId: string; enabled: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      const ctx = { projectId: params.projectId };
      const authUser = { uid: user.uid, email: user.email };
      const input: WebhookUpdateInput = { enabled: params.enabled };
      await repo.update(params.webhookId, input, ctx, authUser);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["webhooks", variables.projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["audit_log", variables.projectId],
      });
      toast.success(t`Webhook updated`);
    },
    onError: () => {
      toast.error(t`Operation failed`);
    },
  });
};
