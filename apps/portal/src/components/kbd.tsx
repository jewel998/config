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

/** Renders a keyboard shortcut as separate <kbd> elements per key, hidden on mobile */
export const Kbd = ({ keys }: KbdProps) => {
  const parts = Array.isArray(keys) ? keys : keys.split("+");

  return (
    <span className="hidden sm:inline-flex items-center gap-0.5">
      {parts.map((part, i) => {
        const normalized = part.trim().toLowerCase();
        const display = MOD_SYMBOLS[normalized] ?? part.trim().toUpperCase();
        return (
          <kbd
            key={i}
            className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1 font-mono text-[10px] font-medium text-muted-foreground"
          >
            {display}
          </kbd>
        );
      })}
    </span>
  );
};

/** Returns whether the user is on macOS (for keybinding logic) */
export const isMacPlatform = isMac;
