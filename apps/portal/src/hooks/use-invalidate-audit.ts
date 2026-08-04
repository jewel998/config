import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { useProjectStore } from "@/stores/project-store";

/**
 * Utility hook that returns a function to invalidate the current project's audit_log query.
 * Reads projectId from the global store so callers don't need to pass it.
 */
export function useInvalidateAuditLog() {
  const queryClient = useQueryClient();
  const projectId = useProjectStore((s) => s.selectedProjectId);

  return useCallback(() => {
    if (projectId) {
      queryClient.invalidateQueries({ queryKey: ["audit_log", projectId] });
    }
  }, [queryClient, projectId]);
}
