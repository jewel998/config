import { useEffect } from "react";

interface Shortcut {
  key: string;
  meta?: boolean;
  ctrl?: boolean;
  handler: () => void;
}

export const useKeyboardShortcuts = (shortcuts: Shortcut[]) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const metaMatch = shortcut.meta ? e.metaKey || e.ctrlKey : true;
        if (e.key.toLowerCase() === shortcut.key.toLowerCase() && metaMatch) {
          e.preventDefault();
          shortcut.handler();
          break;
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
};
