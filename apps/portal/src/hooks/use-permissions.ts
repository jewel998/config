import { useQuery } from "@tanstack/react-query";
import { doc, getDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { PlatformAccess, PlatformPermission } from "@/lib/types";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Reads the signed-in user's OWN platformAccess grant (the only doc the
 * Firestore rules let them read). Drives UI gating for platform capabilities.
 *
 * Enforcement is server-side (Firestore rules + callables); this hook is for
 * UX only — disabling buttons the user cannot action.
 */
export const usePermissions = () => {
  const user = useAuthStore((s) => s.user);
  const email = user?.email?.toLowerCase() ?? null;

  const query = useQuery({
    queryKey: ["platformAccess", email],
    queryFn: async (): Promise<PlatformAccess | null> => {
      if (!email) return null;
      const snap = await getDoc(doc(db, "platformAccess", email));
      if (!snap.exists()) return null;
      return snap.data() as PlatformAccess;
    },
    enabled: !!email,
    staleTime: 5 * 60 * 1000,
  });

  const access = query.data ?? null;
  const isSuperAdmin = access?.isSuperAdmin === true;

  const has = (permission: PlatformPermission): boolean =>
    isSuperAdmin || (access?.permissions?.includes(permission) ?? false);

  return {
    isLoading: query.isLoading,
    isSuperAdmin,
    permissions: access?.permissions ?? [],
    has,
    canCreateProject: has("CREATE_PROJECT"),
  };
};
