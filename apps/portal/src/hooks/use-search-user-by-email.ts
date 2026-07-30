import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserProfile } from "@/lib/team-utils";

/**
 * Search for a user profile by email address (case-insensitive).
 * Only queries when email is non-empty.
 */
export const useSearchUserByEmail = (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();

  return useQuery({
    queryKey: ["searchUserByEmail", normalizedEmail],
    queryFn: async () => {
      if (!normalizedEmail) return null;
      const q = query(
        collection(db, "users"),
        where("email", "==", normalizedEmail),
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      const docData = snapshot.docs[0];
      return { uid: docData.id, ...docData.data() } as UserProfile;
    },
    enabled: normalizedEmail.length > 0 && normalizedEmail.includes("@"),
  });
};
