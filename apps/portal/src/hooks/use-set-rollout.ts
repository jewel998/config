import { useMutation, useQueryClient } from "@tanstack/react-query";
import { doc, updateDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { writeAuditEntry, buildConfigAuditEntry } from "@/lib/audit";
import { useAuthStore } from "@/stores/auth-store";

export const useSetRollout = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({
      projectId,
      environmentId,
      key,
      rolloutPercentage,
      rolloutValue,
      oldRolloutPercentage,
      oldRolloutValue,
    }: {
      projectId: string;
      environmentId: string;
      key: string;
      rolloutPercentage: number;
      rolloutValue: unknown;
      oldRolloutPercentage?: number;
      oldRolloutValue?: unknown;
    }) => {
      if (!user) throw new Error("Not authenticated");
      await writeAuditEntry(
        projectId,
        buildConfigAuditEntry({
          actorId: user.uid,
          action: "update",
          environmentId,
          configKey: key,
          oldValue: {
            rolloutPercentage: oldRolloutPercentage,
            rolloutValue: oldRolloutValue,
          },
          newValue: { rolloutPercentage, rolloutValue },
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
        rolloutPercentage,
        rolloutValue,
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
