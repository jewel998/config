import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { History } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AuditEntry } from "@/lib/types";

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  update: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  delete: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  state_change: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  data_deletion: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

interface AuditLogViewerProps {
  entries: AuditEntry[];
  isLoading?: boolean;
}

export const AuditLogViewer = ({ entries, isLoading }: AuditLogViewerProps) => {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = entries.filter((e) => {
    if (actionFilter !== "all" && e.action !== actionFilter) return false;
    if (searchQuery && !e.resourcePath.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" />
          <Trans>Audit Log</Trans>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input placeholder={t`Filter by resource...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1" />
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t`All actions`}</SelectItem>
              <SelectItem value="create">{t`Create`}</SelectItem>
              <SelectItem value="update">{t`Update`}</SelectItem>
              <SelectItem value="delete">{t`Delete`}</SelectItem>
              <SelectItem value="state_change">{t`State change`}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8"><Trans>Loading...</Trans></p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8"><Trans>No audit entries found.</Trans></p>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {filtered.map((entry) => (
              <div key={entry.id} className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={`rounded-full text-[10px] ${ACTION_COLORS[entry.action] ?? ""}`}>{entry.action}</Badge>
                    <code className="text-xs font-mono text-muted-foreground">{entry.resourcePath}</code>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{new Date(entry.timestamp).toLocaleString()}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  <span>by {entry.actorId}</span>
                </div>
                {(entry.oldValue || entry.newValue) && (
                  <div className="flex gap-2 text-[10px] font-mono mt-1">
                    {entry.oldValue && <span className="truncate text-red-500 max-w-[45%]">- {entry.oldValue.slice(0, 80)}</span>}
                    {entry.newValue && <span className="truncate text-green-500 max-w-[45%]">+ {entry.newValue.slice(0, 80)}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
