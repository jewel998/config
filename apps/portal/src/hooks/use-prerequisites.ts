import { useMutation, useQueryClient } from "@tanstack/react-query";
import { doc, updateDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { writeAuditEntry, buildConfigAuditEntry } from "@/lib/audit";
import { useAuthStore } from "@/stores/auth-store";

export const useSetPrerequisites = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({
      projectId,
      environmentId,
      key,
      prerequisites,
      oldPrerequisites,
    }: {
      projectId: string;
      environmentId: string;
      key: string;
      prerequisites: Array<{ flagKey: string; requiredValue: unknown }>;
      oldPrerequisites?: Array<{ flagKey: string; requiredValue: unknown }>;
    }) => {
      if (!user) throw new Error("Not authenticated");
      await writeAuditEntry(
        projectId,
        buildConfigAuditEntry({
          actorId: user.uid,
          action: "update",
          environmentId,
          configKey: key,
          oldValue: oldPrerequisites,
          newValue: prerequisites,
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
        prerequisites,
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
