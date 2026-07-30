import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, getDocs, query, where, addDoc, deleteDoc, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PendingInvite } from "@/lib/team-utils";
import type { RBACRole } from "@/lib/types";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Fetch pending invites for a given project.
 */
export const usePendingInvites = (projectId: string | null) => {
  return useQuery({
    queryKey: ["pendingInvites", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const q = query(
        collection(db, "pendingInvites"),
        where("projectId", "==", projectId),
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as PendingInvite);
    },
    enabled: !!projectId,
  });
};

/**
 * Create a pending invite.
 * Also adds the email to allowedUsers so the invited user can pass the login gate.
 */
export const useCreateInvite = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({ email, projectId, role }: { email: string; projectId: string; role: RBACRole }) => {
      if (!user) throw new Error("Not authenticated");
      const normalizedEmail = email.trim().toLowerCase();
      const invite = {
        email: normalizedEmail,
        projectId,
        role,
        invitedBy: user.uid,
        createdAt: new Date().toISOString(),
      };

      // Add to allowedUsers so the invited user can log in
      await setDoc(doc(db, "allowedUsers", normalizedEmail), {
        addedBy: user.uid,
        addedAt: new Date().toISOString(),
        reason: "invite",
      });

      const docRef = await addDoc(collection(db, "pendingInvites"), invite);
      return docRef.id;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pendingInvites", variables.projectId] });
    },
  });
};

/**
 * Cancel (delete) a pending invite.
 */
export const useCancelInvite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ inviteId, projectId }: { inviteId: string; projectId: string }) => {
      await deleteDoc(doc(db, "pendingInvites", inviteId));
      return projectId;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pendingInvites", variables.projectId] });
    },
  });
};
