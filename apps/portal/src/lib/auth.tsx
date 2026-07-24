import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
} from "firebase/auth";
import type { User } from "firebase/auth";
import { getDoc, doc } from "firebase/firestore";
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { auth, db } from "./firebase";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  accessDenied: boolean;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const email = firebaseUser.email;
        if (email) {
          const allowedRef = doc(db, "allowedUsers", email);
          const allowedSnap = await getDoc(allowedRef);
          if (!allowedSnap.exists()) {
            await signOut(auth);
            setUser(null);
            setAccessDenied(true);
            setLoading(false);
            return;
          }
        }
        setAccessDenied(false);
        setUser(firebaseUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async () => {
    setAccessDenied(false);
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logOut = async () => {
    await signOut(auth);
    setAccessDenied(false);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, accessDenied, signIn, logOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
