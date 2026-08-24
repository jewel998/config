import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where } from "firebase/firestore";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { db } from "@/lib/firebase";
import type { UserProfile } from "@/lib/team-utils";

/**
 * Search for a user profile by email address (case-insensitive).
 * Debounced by 300ms to avoid excessive Firestore queries on every keystroke.
 */
export const useSearchUserByEmail = (email: string) => {
  const debouncedEmail = useDebouncedValue(email.trim().toLowerCase(), 300);

  return useQuery({
    queryKey: ["searchUserByEmail", debouncedEmail],
    queryFn: async () => {
      if (!debouncedEmail) return null;
      const q = query(collection(db, "users"), where("email", "==", debouncedEmail));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      const docData = snapshot.docs[0];
      return { uid: docData.id, ...docData.data() } as UserProfile;
    },
    enabled: debouncedEmail.length > 0 && debouncedEmail.includes("@"),
  });
};
