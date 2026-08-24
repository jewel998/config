import { useMutation, useQueryClient } from "@tanstack/react-query";
import { doc, updateDoc } from "firebase/firestore";

import { writeAuditEntry, buildConfigAuditEntry } from "@/lib/audit";
import { bumpConfigVersion } from "@/lib/bump-version";
import { db } from "@/lib/firebase";
import type { AuditEntry } from "@/lib/types";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Base params that every config field mutation requires.
 */
interface BaseConfigParams {
  projectId: string;
  environmentId: string;
  key: string;
}

/**
 * Factory that creates a mutation hook for updating a single field
 * on a config document. Handles auth, audit, Firestore write, and
 * query invalidation — eliminating boilerplate across:
 *   useSetTargetingRules, useSetOverrides, useSetSchedule,
 *   useSetPrerequisites, useSetRollout
 */
export function createConfigFieldMutation<TValue, TExtra = unknown>(options: {
  field: string;
  getValue: (params: TExtra & BaseConfigParams) => TValue;
  buildUpdate?: (value: TValue, userId: string) => Record<string, unknown>;
  auditAction?: (params: TExtra & BaseConfigParams) => AuditEntry["action"];
  getOldValue?: (params: TExtra & BaseConfigParams) => unknown;
}) {
  const { field, getValue, buildUpdate, auditAction, getOldValue } = options;

  return () => {
    const queryClient = useQueryClient();
    const user = useAuthStore((s) => s.user);

    return useMutation({
      mutationFn: async (params: TExtra & BaseConfigParams) => {
        if (!user) throw new Error("Not authenticated");

        const { projectId, environmentId, key } = params;
        const newValue = getValue(params);
        const oldValue = getOldValue?.(params);
        const action = auditAction?.(params) ?? "update";

        await writeAuditEntry(
          projectId,
          buildConfigAuditEntry({
            actorId: user.uid,
            action,
            environmentId,
            configKey: key,
            oldValue,
            newValue,
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

        const update = buildUpdate
          ? buildUpdate(newValue, user.uid)
          : {
              [field]: newValue,
              updatedAt: new Date().toISOString(),
              updatedBy: user.uid,
            };

        await updateDoc(docRef, update);

        // Bump environment config version + record changed key
        await bumpConfigVersion(projectId, environmentId, [key]);
      },
      onSuccess: (_data, variables: TExtra & BaseConfigParams) => {
        queryClient.invalidateQueries({
          queryKey: ["configs", variables.projectId, variables.environmentId],
        });
        queryClient.invalidateQueries({
          queryKey: ["audit_log", variables.projectId],
        });
      },
    });
  };
}
