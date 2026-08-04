import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { History, Loader2, User } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuditLog } from "@/hooks/use-audit-log";
import { useUserProfiles } from "@/hooks/use-user-profiles";
import type { AuditEntry } from "@/lib/types";

const ACTION_COLORS: Record<string, string> = {
  create:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  update: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  delete: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  state_change:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  data_deletion:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

const ACTION_LABELS: Record<string, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  state_change: "State changed",
  data_deletion: "Data deleted",
};

interface AuditLogViewerProps {
  projectId: string;
}

export const AuditLogViewer = ({ projectId }: AuditLogViewerProps) => {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const filters = useMemo(
    () => (actionFilter !== "all" ? { action: actionFilter } : undefined),
    [actionFilter],
  );

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useAuditLog(projectId, filters);

  const entries = useMemo(
    () => data?.pages.flatMap((p) => p.entries) ?? [],
    [data],
  );

  // Collect unique actor IDs for name resolution
  const actorIds = useMemo(
    () => [...new Set(entries.map((e) => e.actorId))],
    [entries],
  );
  const { data: profiles = {} } = useUserProfiles(actorIds);

  // Client-side search filter (resource path)
  const filtered = useMemo(
    () =>
      searchQuery
        ? entries.filter((e) =>
            e.resourcePath.toLowerCase().includes(searchQuery.toLowerCase()),
          )
        : entries,
    [entries, searchQuery],
  );

  // Infinite scroll observer
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();
      if (!node) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        },
        { threshold: 0.1 },
      );
      observerRef.current.observe(node);
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  const getActorName = (actorId: string) => {
    const profile = profiles[actorId];
    if (profile?.displayName) return profile.displayName;
    if (profile?.email) return profile.email;
    return actorId.slice(0, 8) + "…";
  };

  const formatResourcePath = (path: string) => {
    // e.g. "environments/prod/configs/feature.enabled" → "feature.enabled"
    // e.g. "segments/abc123" → "segment"
    const parts = path.split("/");
    if (parts.includes("configs") && parts.length >= 4) {
      return parts[parts.length - 1];
    }
    if (parts[0] === "segments") {
      return "segment";
    }
    return parts[parts.length - 1] || path;
  };

  const formatDescription = (entry: AuditEntry) => {
    const resource = formatResourcePath(entry.resourcePath);
    const action = ACTION_LABELS[entry.action] ?? entry.action;
    return `${action} ${resource}`;
  };

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" />
          <Trans>Audit Log</Trans>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder={t`Search by resource...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t`All actions`}</SelectItem>
              <SelectItem value="create">{t`Create`}</SelectItem>
              <SelectItem value="update">{t`Update`}</SelectItem>
              <SelectItem value="delete">{t`Delete`}</SelectItem>
              <SelectItem value="state_change">{t`State change`}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Entry List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            <Trans>No audit entries found.</Trans>
          </p>
        ) : (
          <div
            ref={scrollRef}
            className="space-y-2 max-h-[70vh] overflow-y-auto pr-1"
          >
            {filtered.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border p-3 space-y-2 hover:bg-muted/30 transition-colors"
              >
                {/* Top row: action + description + time */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      className={`rounded-full text-xs px-2 py-0.5 ${ACTION_COLORS[entry.action] ?? ""}`}
                    >
                      {ACTION_LABELS[entry.action] ?? entry.action}
                    </Badge>
                    <code className="text-xs font-mono text-foreground">
                      {formatResourcePath(entry.resourcePath)}
                    </code>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>

                {/* Actor */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>{getActorName(entry.actorId)}</span>
                </div>

                {/* Diff preview */}
                {(entry.oldValue || entry.newValue) && (
                  <div className="flex flex-col gap-0.5 text-xs font-mono mt-1 p-2 rounded bg-muted/40">
                    {entry.oldValue && (
                      <span className="text-red-600 dark:text-red-400 truncate">
                        − {entry.oldValue.slice(0, 120)}
                      </span>
                    )}
                    {entry.newValue && (
                      <span className="text-green-600 dark:text-green-400 truncate">
                        + {entry.newValue.slice(0, 120)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Infinite scroll sentinel */}
            {hasNextPage && (
              <div ref={sentinelRef} className="flex justify-center py-4">
                {isFetchingNextPage && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
