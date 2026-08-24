import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { create } from "zustand";

import { auth, db } from "@/lib/firebase";
import { computeProfileSync } from "@/lib/team-utils";
import type { UserProfile, PendingInvite } from "@/lib/team-utils";

interface AuthState {
  user: User | null;
  loading: boolean;
  accessDenied: boolean;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
  _initialize: () => () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  accessDenied: false,

  signIn: async () => {
    set({ accessDenied: false });
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  },

  logOut: async () => {
    await signOut(auth);
    set({ accessDenied: false, user: null });
  },

  _initialize: () => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const email = firebaseUser.email;
        if (email) {
          try {
            const allowedRef = doc(db, "allowedUsers", email);
            const allowedSnap = await getDoc(allowedRef);
            if (!allowedSnap.exists()) {
              await signOut(auth);
              set({ user: null, accessDenied: true, loading: false });
              return;
            }
          } catch {
            // Fail-closed: if we can't verify access, deny it
            await signOut(auth);
            set({ user: null, accessDenied: true, loading: false });
            return;
          }
        }

        // Profile sync (non-blocking)
        try {
          await syncUserProfile(firebaseUser);
        } catch {}

        // Invite resolution (non-blocking)
        try {
          await resolveInvites(firebaseUser);
        } catch {}

        set({ accessDenied: false, user: firebaseUser, loading: false });
      } else {
        set({ user: null, loading: false });
      }
    });

    return unsubscribe;
  },
}));

// ═══════════════════════════════════════════════════════════════
// Profile Sync — writes user profile to Firestore on sign-in
// ═══════════════════════════════════════════════════════════════

async function syncUserProfile(firebaseUser: User): Promise<void> {
  const userRef = doc(db, "users", firebaseUser.uid);
  const snapshot = await getDoc(userRef);

  const existingDoc: UserProfile | null = snapshot.exists()
    ? (snapshot.data() as UserProfile)
    : null;

  const result = computeProfileSync(
    {
      uid: firebaseUser.uid,
      displayName: firebaseUser.displayName,
      email: firebaseUser.email,
      photoURL: firebaseUser.photoURL,
    },
    existingDoc,
  );

  if (result.action === "create" && result.payload) {
    await setDoc(userRef, result.payload);
  } else if (result.action === "update" && result.payload) {
    await updateDoc(userRef, result.payload);
  }
  // "skip" → do nothing
}

// ═══════════════════════════════════════════════════════════════
// Invite Resolution — auto-adds user to projects on sign-in
// ═══════════════════════════════════════════════════════════════

async function resolveInvites(firebaseUser: User): Promise<void> {
  if (!firebaseUser.email) return;

  const normalizedEmail = firebaseUser.email.toLowerCase();
  const emailKey = `email:${normalizedEmail}`;

  // Query pending invites for this email
  const invitesQuery = query(
    collection(db, "pendingInvites"),
    where("email", "==", normalizedEmail),
  );
  const invitesSnapshot = await getDocs(invitesQuery);

  if (invitesSnapshot.empty) return;

  const invites: PendingInvite[] = invitesSnapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<PendingInvite, "id">),
  }));

  // For each invite, claim the email-prefixed entry:
  // Replace "email:user@example.com" with the real UID in authorizedUsers
  for (const invite of invites) {
    try {
      const projectRef = doc(db, "projects", invite.projectId);
      const projectSnap = await getDoc(projectRef);

      if (projectSnap.exists()) {
        const projectData = projectSnap.data();
        const currentAuth: string[] = projectData.authorizedUsers ?? [];

        // Only claim if the email key exists and UID isn't already there
        if (currentAuth.includes(emailKey) && !currentAuth.includes(firebaseUser.uid)) {
          // Swap email key for real UID
          const newAuth = currentAuth
            .filter((entry) => entry !== emailKey)
            .concat(firebaseUser.uid);

          // Move the role from email key to uid
          const currentRoles = projectData.roles ?? {};
          const role = currentRoles[emailKey] ?? invite.role;
          const newRoles = { ...currentRoles };
          delete newRoles[emailKey];
          newRoles[firebaseUser.uid] = role;

          await updateDoc(projectRef, {
            authorizedUsers: newAuth,
            roles: newRoles,
          });
        } else if (currentAuth.includes(emailKey) && currentAuth.includes(firebaseUser.uid)) {
          // Already claimed — just clean up the email key
          const newAuth = currentAuth.filter((entry) => entry !== emailKey);
          const currentRoles = projectData.roles ?? {};
          const newRoles = { ...currentRoles };
          delete newRoles[emailKey];
          await updateDoc(projectRef, {
            authorizedUsers: newAuth,
            roles: newRoles,
          });
        }
      }

      // Delete the pending invite
      if (invite.id) {
        await deleteDoc(doc(db, "pendingInvites", invite.id));
      }
    } catch {}
  }
}
