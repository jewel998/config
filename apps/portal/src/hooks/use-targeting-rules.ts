import { useMutation, useQueryClient } from "@tanstack/react-query";
import { doc, updateDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { writeAuditEntry, buildConfigAuditEntry } from "@/lib/audit";
import type { TargetingRule } from "@/lib/types";
import { useAuthStore } from "@/stores/auth-store";

export const useSetTargetingRules = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({
      projectId,
      environmentId,
      key,
      rules,
      oldRules,
    }: {
      projectId: string;
      environmentId: string;
      key: string;
      rules: TargetingRule[];
      oldRules?: TargetingRule[];
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Write audit entry first — if this fails, block the modification
      await writeAuditEntry(
        projectId,
        buildConfigAuditEntry({
          actorId: user.uid,
          action: "update",
          environmentId,
          configKey: key,
          oldValue: oldRules,
          newValue: rules,
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
        targetingRules: rules,
        updatedAt: new Date().toISOString(),
        updatedBy: user.uid,
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["configs", variables.projectId, variables.environmentId],
      });
      queryClient.invalidateQueries({
        queryKey: ["audit_log", variables.projectId],
      });
    },
  });
};
