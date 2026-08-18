import { useMutation } from "@tanstack/react-query";
import { httpsCallable } from "firebase/functions";

import { functions } from "@/lib/firebase";

// ─── Export Configs Mutation ──────────────────────────────────

interface ExportConfigsArgs {
  projectId: string;
  exportType: "full" | "user";
  userId?: string;
}

interface ExportConfigsResult {
  downloadUrl: string;
  expiresAt: string;
  exportId: string;
}

export const useExportConfigs = () => {
  return useMutation({
    mutationFn: async (
      args: ExportConfigsArgs,
    ): Promise<ExportConfigsResult> => {
      const callable = httpsCallable<ExportConfigsArgs, ExportConfigsResult>(
        functions,
        "exportConfigs",
      );
      const result = await callable(args);
      return result.data;
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 4000),
  });
};
