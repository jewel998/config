import { t } from "@lingui/core/macro";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { doc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";

import { db } from "@/lib/firebase";

export const useUpdateProjectDescription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      description,
    }: {
      projectId: string;
      description: string;
    }) => {
      const projectRef = doc(db, "projects", projectId);
      await updateDoc(projectRef, {
        description,
        updatedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success(t`Description saved`);
    },
    onError: () => {
      toast.error(t`Failed to save description`);
    },
  });
};
