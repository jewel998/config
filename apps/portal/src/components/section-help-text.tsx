import { SECTION_HELP } from "@/lib/config-templates";
import type { SectionId } from "@/lib/types";

interface SectionHelpTextProps {
  sectionId: SectionId;
}

export const SectionHelpText = ({ sectionId }: SectionHelpTextProps) => {
  const help = SECTION_HELP[sectionId];
  if (!help) return null;

  return (
    <div className="px-3 pb-1.5 space-y-0.5">
      <p className="text-xs text-muted-foreground">{help.description}</p>
      {help.tip && (
        <p className="text-xs text-muted-foreground/70">
          <span className="font-medium">Tip:</span> {help.tip}
        </p>
      )}
    </div>
  );
};
