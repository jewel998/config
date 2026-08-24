import { useQuery } from "@tanstack/react-query";
import { collection, getDocs } from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { WebhookConfig } from "@/types/webhook";

export const useWebhooks = (projectId: string | null) => {
  return useQuery({
    queryKey: ["webhooks", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const ref = collection(db, "projects", projectId, "webhooks");
      const snapshot = await getDocs(ref);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as WebhookConfig);
    },
    enabled: !!projectId,
  });
};
