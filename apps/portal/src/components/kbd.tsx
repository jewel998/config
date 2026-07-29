interface KbdProps {
  keys: string;
}

/** Renders a keyboard shortcut badge, hidden on mobile */
export const Kbd = ({ keys }: KbdProps) => (
  <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
    {keys}
  </kbd>
);
