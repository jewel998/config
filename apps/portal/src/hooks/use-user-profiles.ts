import { useQuery } from "@tanstack/react-query";
import { doc, getDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { UserProfile } from "@/lib/team-utils";

/**
 * Batch-fetch user profiles from the users collection for a list of UIDs.
 * Returns a map of uid → UserProfile (or undefined if not found).
 */
export const useUserProfiles = (uids: string[]) => {
  return useQuery({
    queryKey: ["userProfiles", uids],
    queryFn: async () => {
      if (uids.length === 0) return {};
      const results: Record<string, UserProfile> = {};
      // Fetch in parallel (Firestore doesn't have a batch-get via client SDK,
      // so we fetch individually but in parallel)
      const fetches = uids.map(async (uid) => {
        try {
          const docRef = doc(db, "users", uid);
          const snapshot = await getDoc(docRef);
          if (snapshot.exists()) {
            results[uid] = { uid, ...snapshot.data() } as UserProfile;
          }
        } catch {
          // Skip profiles that fail to load
        }
      });
      await Promise.all(fetches);
      return results;
    },
    enabled: uids.length > 0,
  });
};
