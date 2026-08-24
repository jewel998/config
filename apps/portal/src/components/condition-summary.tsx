import { formatConditionSummary } from "@/lib/config-utils";
import type { PredicateGroup } from "@/lib/types";

interface ConditionSummaryProps {
  conditions: PredicateGroup[];
  maxGroups?: number;
}

export const ConditionSummary = ({ conditions, maxGroups = 1 }: ConditionSummaryProps) => {
  const summary = formatConditionSummary(conditions, maxGroups);

  return <span className="text-[10px] text-muted-foreground font-mono truncate">{summary}</span>;
};
