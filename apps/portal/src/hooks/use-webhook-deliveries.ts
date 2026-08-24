import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { WebhookDelivery } from "@/types/webhook";

export const useWebhookDeliveries = (projectId: string | null, webhookId: string | null) => {
  return useQuery({
    queryKey: ["webhook-deliveries", projectId, webhookId],
    queryFn: async () => {
      if (!projectId || !webhookId) return [];
      const ref = collection(db, "projects", projectId, "webhooks", webhookId, "deliveries");
      const q = query(ref, orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as WebhookDelivery);
    },
    enabled: !!projectId && !!webhookId,
  });
};
