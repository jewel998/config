import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, getDocs, query, where, addDoc, deleteDoc, doc, setDoc, updateDoc, deleteField } from "firebase/firestore";
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
 * - Adds email to allowedUsers (login gate)
 * - Pre-adds "email:user@example.com" to project's authorizedUsers (read access)
 * - Creates the pending invite doc
 */
export const useCreateInvite = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({ email, projectId, role }: { email: string; projectId: string; role: RBACRole }) => {
      if (!user) throw new Error("Not authenticated");
      const normalizedEmail = email.trim().toLowerCase();
      const emailKey = `email:${normalizedEmail}`;
      const invite = {
        email: normalizedEmail,
        projectId,
        role,
        invitedBy: user.uid,
        createdAt: new Date().toISOString(),
      };

      // 1. Add to allowedUsers so the invited user can log in
      await setDoc(doc(db, "allowedUsers", normalizedEmail), {
        addedBy: user.uid,
        addedAt: new Date().toISOString(),
        reason: "invite",
      });

      // 2. Pre-add email-prefixed entry to project authorizedUsers + set role
      const { arrayUnion } = await import("firebase/firestore");
      await updateDoc(doc(db, "projects", projectId), {
        authorizedUsers: arrayUnion(emailKey),
        [`roles.${emailKey}`]: role,
      });

      // 3. Create the pending invite document
      const docRef = await addDoc(collection(db, "pendingInvites"), invite);
      return docRef.id;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pendingInvites", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
};

/**
 * Cancel (delete) a pending invite.
 * Also removes the email-prefixed entry from the project's authorizedUsers.
 */
export const useCancelInvite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ inviteId, projectId, email }: { inviteId: string; projectId: string; email?: string }) => {
      // Remove email-prefixed entry from project if email provided
      if (email) {
        const emailKey = `email:${email.toLowerCase()}`;
        const { arrayRemove } = await import("firebase/firestore");
        const projectRef = doc(db, "projects", projectId);
        await updateDoc(projectRef, {
          authorizedUsers: arrayRemove(emailKey),
          [`roles.${emailKey}`]: deleteField(),
        });
      }
      await deleteDoc(doc(db, "pendingInvites", inviteId));
      return projectId;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pendingInvites", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
};
