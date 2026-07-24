import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { create } from "zustand";

import { auth, db } from "@/lib/firebase";

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
            // If Firestore check fails, allow access
          }
        }
        set({ accessDenied: false, user: firebaseUser, loading: false });
      } else {
        set({ user: null, loading: false });
      }
    });

    return unsubscribe;
  },
}));
