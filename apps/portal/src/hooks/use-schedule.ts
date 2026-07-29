import { useMutation, useQueryClient } from "@tanstack/react-query";
import { doc, updateDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { writeAuditEntry, buildConfigAuditEntry } from "@/lib/audit";
import { useAuthStore } from "@/stores/auth-store";

export const useSetSchedule = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({
      projectId,
      environmentId,
      key,
      schedule,
      oldSchedule,
    }: {
      projectId: string;
      environmentId: string;
      key: string;
      schedule: { targetValue: unknown; activateAt: string } | null;
      oldSchedule?: { targetValue: unknown; activateAt: string } | null;
    }) => {
      if (!user) throw new Error("Not authenticated");
      await writeAuditEntry(
        projectId,
        buildConfigAuditEntry({
          actorId: user.uid,
          action: schedule ? "update" : "delete",
          environmentId,
          configKey: key,
          oldValue: oldSchedule,
          newValue: schedule,
        }),
      );
      const docRef = doc(
        db,
        "projects",
        projectId,
        "environments",
        environmentId,
        "configs",
        key,
      );
      await updateDoc(docRef, {
        schedule: schedule ?? null,
        updatedAt: new Date().toISOString(),
        updatedBy: user.uid,
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["configs", variables.projectId, variables.environmentId],
      });
    },
  });
};
