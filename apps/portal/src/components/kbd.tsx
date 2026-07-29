/** Detects if the user is on macOS */
const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform);

/** Symbol map for modifier keys — shows platform-appropriate glyphs */
const MOD_SYMBOLS: Record<string, string> = {
  meta: isMac ? "⌘" : "Ctrl",
  ctrl: isMac ? "⌃" : "Ctrl",
  alt: isMac ? "⌥" : "Alt",
  shift: "⇧",
};

interface KbdProps {
  /** Keyboard shortcut(s). Accepts individual keys or "+" separated combos.
   *  Examples: "⌘" | "N" | "meta+k" | "alt+n"
   */
  keys: string | string[];
}

/** Renders a keyboard shortcut badge with individual key caps, hidden on mobile */
export const Kbd = ({ keys }: KbdProps) => {
  const parts = Array.isArray(keys) ? keys : keys.split("+");

  return (
    <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border bg-muted px-1 font-mono text-[10px] font-medium text-muted-foreground">
      {parts.map((part, i) => {
        const normalized = part.trim().toLowerCase();
        const display = MOD_SYMBOLS[normalized] ?? part.trim().toUpperCase();
        return (
          <span key={i} className="min-w-[1ch] text-center">
            {display}
          </span>
        );
      })}
    </kbd>
  );
};

/** Returns the correct modifier key event property for the platform */
export const useModKey = () => isMac;
