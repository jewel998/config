import { t } from "@lingui/core/macro";
import { useMutation } from "@tanstack/react-query";
import { getFunctions, httpsCallable } from "firebase/functions";
import { toast } from "sonner";

interface TestResult {
  success: boolean;
  httpStatus: number | null;
  error: string | null;
}

export const useTestWebhook = () => {
  return useMutation({
    mutationFn: async ({
      projectId,
      webhookId,
    }: {
      projectId: string;
      webhookId: string;
    }) => {
      const functions = getFunctions();
      const testFn = httpsCallable<
        { projectId: string; webhookId: string },
        TestResult
      >(functions, "testWebhook");
      const result = await testFn({ projectId, webhookId });
      return result.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(
          t`Test delivery successful (HTTP ${String(data.httpStatus)})`,
        );
      } else {
        toast.error(t`Test delivery failed: ${data.error ?? "Unknown error"}`);
      }
    },
    onError: () => {
      toast.error(t`Failed to send test webhook`);
    },
  });
};
