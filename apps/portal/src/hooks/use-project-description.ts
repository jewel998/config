import { t } from "@lingui/core/macro";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { doc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";

import { db } from "@/lib/firebase";
import { writeAuditEntry, buildAuditEntry } from "@/lib/audit";
import { useAuthStore } from "@/stores/auth-store";

export const useUpdateProjectDescription = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({
      projectId,
      description,
      oldDescription,
    }: {
      projectId: string;
      description: string;
      oldDescription?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const projectRef = doc(db, "projects", projectId);
      await updateDoc(projectRef, {
        description,
        updatedAt: new Date().toISOString(),
      });
      try {
        await writeAuditEntry(
          projectId,
          buildAuditEntry({
            actorId: user.uid,
            action: "update",
            resourcePath: "project/description",
            oldValue: oldDescription
              ? { description: oldDescription }
              : undefined,
            newValue: { description },
          }),
        );
      } catch {
        /* best-effort */
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({
        queryKey: ["audit_log", variables.projectId],
      });
      toast.success(t`Description saved`);
    },
    onError: () => {
      toast.error(t`Failed to save description`);
    },
  });
};
