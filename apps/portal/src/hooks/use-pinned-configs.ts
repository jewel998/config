import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "pinned-configs";

/** Get all pinned config keys for a given project+environment */
const getStorageKey = (projectId: string, envId: string) =>
  `${STORAGE_KEY}:${projectId}:${envId}`;

const getPinned = (projectId: string, envId: string): string[] => {
  try {
    const raw = localStorage.getItem(getStorageKey(projectId, envId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const setPinned = (projectId: string, envId: string, keys: string[]) => {
  try {
    localStorage.setItem(getStorageKey(projectId, envId), JSON.stringify(keys));
  } catch {
    // ignore
  }
  // Notify subscribers
  window.dispatchEvent(new Event("pinned-configs-change"));
};

/** Hook for managing pinned/favorite configs. Stored in localStorage per project+environment. */
export const usePinnedConfigs = (
  projectId: string | null,
  envId: string | null,
) => {
  const subscribe = useCallback((cb: () => void) => {
    window.addEventListener("pinned-configs-change", cb);
    window.addEventListener("storage", cb);
    return () => {
      window.removeEventListener("pinned-configs-change", cb);
      window.removeEventListener("storage", cb);
    };
  }, []);

  const getSnapshot = useCallback(() => {
    if (!projectId || !envId) return "[]";
    return localStorage.getItem(getStorageKey(projectId, envId)) ?? "[]";
  }, [projectId, envId]);

  const raw = useSyncExternalStore(subscribe, getSnapshot, () => "[]");
  const pinned: string[] = JSON.parse(raw);

  const isPinned = useCallback((key: string) => pinned.includes(key), [pinned]);

  const togglePin = useCallback(
    (key: string) => {
      if (!projectId || !envId) return;
      const current = getPinned(projectId, envId);
      if (current.includes(key)) {
        setPinned(
          projectId,
          envId,
          current.filter((k) => k !== key),
        );
      } else {
        setPinned(projectId, envId, [...current, key]);
      }
    },
    [projectId, envId],
  );

  return { pinned, isPinned, togglePin };
};
