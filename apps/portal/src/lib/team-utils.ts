import type { RBACRole } from "@/lib/types";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

/** User profile stored in Firestore users/{uid} */
export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string; // stored lowercase, immutable after creation
  photoURL: string | null;
}

/** Pending invite stored in Firestore pendingInvites/{inviteId} */
export interface PendingInvite {
  id?: string; // Firestore document ID (populated on read)
  email: string; // lowercase
  projectId: string;
  role: RBACRole;
  invitedBy: string; // uid of the admin who invited
  createdAt: string; // ISO timestamp
}

// ═══════════════════════════════════════════════════════════════
// Profile Sync Logic
// ═══════════════════════════════════════════════════════════════

export interface ProfileSyncResult {
  action: "create" | "update" | "skip";
  payload?: Partial<UserProfile>;
}

/**
 * Determine what action to take to sync a user's profile to Firestore.
 *
 * Rules:
 * - If existingDoc is null → create with full profile (email lowercase)
 * - If displayName + photoURL both match → skip
 * - If any differ → update only the changed fields (NEVER email)
 */
export function computeProfileSync(
  authUser: {
    uid: string;
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  },
  existingDoc: UserProfile | null,
): ProfileSyncResult {
  // No existing doc — create
  if (!existingDoc) {
    return {
      action: "create",
      payload: {
        uid: authUser.uid,
        displayName: authUser.displayName,
        email: (authUser.email ?? "").toLowerCase(),
        photoURL: authUser.photoURL,
      },
    };
  }

  // Compare mutable fields only (displayName, photoURL — NEVER email)
  const changes: Partial<UserProfile> = {};

  if (authUser.displayName !== existingDoc.displayName) {
    changes.displayName = authUser.displayName;
  }
  if (authUser.photoURL !== existingDoc.photoURL) {
    changes.photoURL = authUser.photoURL;
  }

  if (Object.keys(changes).length === 0) {
    return { action: "skip" };
  }

  return { action: "update", payload: changes };
}

// ═══════════════════════════════════════════════════════════════
// Invite Resolution Logic
// ═══════════════════════════════════════════════════════════════

export interface InviteResolutionAction {
  invite: PendingInvite;
  action: "add_and_delete" | "delete_only";
}

/**
 * Determine what action to take for each pending invite.
 *
 * Rules:
 * - If user is NOT in the project's authorizedUsers → add and delete
 * - If user IS already a member → just delete (don't re-add)
 */
export function computeInviteResolutions(
  userUid: string,
  invites: PendingInvite[],
  projectMemberships: Record<string, string[]>, // projectId → authorizedUsers
): InviteResolutionAction[] {
  return invites.map((invite) => {
    const members = projectMemberships[invite.projectId] ?? [];
    const isAlreadyMember = members.includes(userUid);

    return {
      invite,
      action: isAlreadyMember ? "delete_only" : "add_and_delete",
    };
  });
}

// ═══════════════════════════════════════════════════════════════
// Initials Extraction
// ═══════════════════════════════════════════════════════════════

/**
 * Extract initials from a display name.
 *
 * Rules:
 * - null or empty → "?"
 * - Split by whitespace, take first char of first and last parts
 * - Return uppercase, max 2 characters
 */
export function getInitials(displayName: string | null): string {
  if (!displayName || displayName.trim().length === 0) {
    return "?";
  }

  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0][0].toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
