import { t } from "@lingui/core/macro";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { toast } from "sonner";

import { db } from "@/lib/firebase";
import { useAuthStore } from "@/stores/auth-store";
import type { WebhookConfig } from "@/types/webhook";

const MAX_WEBHOOKS = 10;

// ─── Factory ──────────────────────────────────────────────────

function createWebhookMutation<TParams>(options: {
  mutationFn: (
    params: TParams & { projectId: string },
    userId: string,
  ) => Promise<unknown>;
  toastSuccess: string;
  toastError?: string;
}) {
  return () => {
    const queryClient = useQueryClient();
    const user = useAuthStore((s) => s.user);

    return useMutation({
      mutationFn: async (params: TParams & { projectId: string }) => {
        if (!user) throw new Error("Not authenticated");
        return options.mutationFn(params, user.uid);
      },
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({
          queryKey: ["webhooks", variables.projectId],
        });
        queryClient.invalidateQueries({
          queryKey: ["audit_log", variables.projectId],
        });
        toast.success(options.toastSuccess);
      },
      onError: () => {
        toast.error(options.toastError ?? t`Operation failed`);
      },
    });
  };
}

// ─── Generated Hooks ──────────────────────────────────────────

export const useCreateWebhook = createWebhookMutation<{
  name: string;
  url: string;
  format:
    "standard" | "slack" | "discord" | "google-chat" | "ms-teams" | "custom";
  eventTypes: string[];
  resourceCategories: string[];
  environments: string[];
  customTemplate?: string;
}>({
  toastSuccess: t`Webhook created`,
  toastError: t`Failed to create webhook`,
  mutationFn: async (params, _userId) => {
    const ref = collection(db, "projects", params.projectId, "webhooks");
    const snapshot = await getDocs(ref);
    if (snapshot.size >= MAX_WEBHOOKS) {
      throw new Error(`Maximum ${MAX_WEBHOOKS} webhooks per project`);
    }
    await addDoc(ref, {
      name: params.name,
      url: params.url,
      enabled: true,
      format: params.format,
      eventTypes: params.eventTypes,
      resourceCategories: params.resourceCategories,
      environments: params.environments,
      ...(params.customTemplate
        ? { customTemplate: params.customTemplate }
        : {}),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },
});

export const useUpdateWebhook = createWebhookMutation<{
  webhookId: string;
  data: Partial<Omit<WebhookConfig, "id" | "createdAt">>;
}>({
  toastSuccess: t`Webhook updated`,
  toastError: t`Failed to update webhook`,
  mutationFn: async (params) => {
    const ref = doc(
      db,
      "projects",
      params.projectId,
      "webhooks",
      params.webhookId,
    );
    await updateDoc(ref, {
      ...params.data,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const useDeleteWebhook = createWebhookMutation<{ webhookId: string }>({
  toastSuccess: t`Webhook deleted`,
  toastError: t`Failed to delete webhook`,
  mutationFn: async (params) => {
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
    // Delete the webhook document
    await deleteDoc(
      doc(db, "projects", params.projectId, "webhooks", params.webhookId),
    );
  },
});

export const useToggleWebhook = createWebhookMutation<{
  webhookId: string;
  enabled: boolean;
}>({
  toastSuccess: t`Webhook updated`,
  mutationFn: async (params) => {
    const ref = doc(
      db,
      "projects",
      params.projectId,
      "webhooks",
      params.webhookId,
    );
    await updateDoc(ref, {
      enabled: params.enabled,
      updatedAt: new Date().toISOString(),
    });
  },
});
