import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { ArrowLeftRight, History, Loader2, Rows3, User } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import { ResponsiveModal } from "@/components/responsive-modal";
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

function tryPrettifyJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

/** Shimmer loading skeleton for audit entries */
const EntrySkeleton = () => (
  <div className="rounded-lg border p-3 space-y-2 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="h-5 w-16 rounded-full bg-muted" />
        <div className="h-4 w-32 rounded bg-muted" />
      </div>
      <div className="h-4 w-28 rounded bg-muted" />
    </div>
    <div className="flex items-center gap-1.5">
      <div className="h-3 w-3 rounded-full bg-muted" />
      <div className="h-3 w-24 rounded bg-muted" />
    </div>
    <div className="h-10 w-full rounded bg-muted/60" />
  </div>
);

interface AuditLogViewerProps {
  projectId: string;
}

export const AuditLogViewer = ({ projectId }: AuditLogViewerProps) => {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [diffEntry, setDiffEntry] = useState<AuditEntry | null>(null);
  const [diffMode, setDiffMode] = useState<"side-by-side" | "line-by-line">(
    "side-by-side",
  );

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

  // Client-side search filter
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
        (observedEntries) => {
          if (
            observedEntries[0].isIntersecting &&
            hasNextPage &&
            !isFetchingNextPage
          ) {
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
    const parts = path.split("/");
    if (parts.includes("configs") && parts.length >= 4) {
      return parts[parts.length - 1];
    }
    if (parts[0] === "segments") {
      return "segment";
    }
    return parts[parts.length - 1] || path;
  };

  return (
    <>
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
            <div className="space-y-2">
              <EntrySkeleton />
              <EntrySkeleton />
              <EntrySkeleton />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              <Trans>No audit entries found.</Trans>
            </p>
          ) : (
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {filtered.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border p-3 space-y-2 hover:bg-muted/30 transition-colors"
                >
                  {/* Header row */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        className={`rounded-full text-xs px-2 py-0.5 ${ACTION_COLORS[entry.action] ?? ""}`}
                      >
                        {ACTION_LABELS[entry.action] ?? entry.action}
                      </Badge>
                      <code className="text-sm font-mono text-foreground font-medium">
                        {formatResourcePath(entry.resourcePath)}
                      </code>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>

                  {/* Actor */}
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    <span>{getActorName(entry.actorId)}</span>
                  </div>

                  {/* Diff preview + View Changes button */}
                  {(entry.oldValue || entry.newValue) && (
                    <div className="flex flex-col gap-1.5">
                      <div className="text-xs font-mono p-2 rounded bg-muted/40 overflow-hidden max-h-16">
                        {entry.oldValue && (
                          <p className="text-red-600 dark:text-red-400 truncate">
                            − {entry.oldValue.slice(0, 80)}
                          </p>
                        )}
                        {entry.newValue && (
                          <p className="text-green-600 dark:text-green-400 truncate">
                            + {entry.newValue.slice(0, 80)}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="self-start h-7 text-xs gap-1.5"
                        onClick={() => setDiffEntry(entry)}
                      >
                        <ArrowLeftRight className="h-3 w-3" />
                        <Trans>View changes</Trans>
                      </Button>
                    </div>
                  )}
                </div>
              ))}

              {/* Infinite scroll: always show shimmer skeleton */}
              <div ref={sentinelRef}>
                {hasNextPage && (
                  <div className="space-y-2 pt-1">
                    <EntrySkeleton />
                    <EntrySkeleton />
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diff Viewer Modal */}
      {diffEntry && (
        <ResponsiveModal
          open={!!diffEntry}
          onOpenChange={(open) => !open && setDiffEntry(null)}
          title={<Trans>Change Details</Trans>}
          description={
            <span className="font-mono text-xs">
              {formatResourcePath(diffEntry.resourcePath)} ·{" "}
              {ACTION_LABELS[diffEntry.action] ?? diffEntry.action} ·{" "}
              {new Date(diffEntry.timestamp).toLocaleString()}
            </span>
          }
        >
          <div className="space-y-3">
            {/* Mode toggle */}
            <div className="flex items-center gap-2">
              <Button
                variant={diffMode === "side-by-side" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs rounded-full gap-1"
                onClick={() => setDiffMode("side-by-side")}
              >
                <ArrowLeftRight className="h-3 w-3" />
                <Trans>Side by side</Trans>
              </Button>
              <Button
                variant={diffMode === "line-by-line" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs rounded-full gap-1"
                onClick={() => setDiffMode("line-by-line")}
              >
                <Rows3 className="h-3 w-3" />
                <Trans>Line by line</Trans>
              </Button>
            </div>

            {diffMode === "side-by-side" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Old value */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-red-600 dark:text-red-400">
                    <Trans>Before</Trans>
                  </p>
                  <pre className="text-xs font-mono p-3 rounded-lg border bg-red-50/50 dark:bg-red-950/20 overflow-auto max-h-[50vh] whitespace-pre-wrap break-all">
                    {diffEntry.oldValue
                      ? tryPrettifyJson(diffEntry.oldValue)
                      : "—"}
                  </pre>
                </div>
                {/* New value */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-green-600 dark:text-green-400">
                    <Trans>After</Trans>
                  </p>
                  <pre className="text-xs font-mono p-3 rounded-lg border bg-green-50/50 dark:bg-green-950/20 overflow-auto max-h-[50vh] whitespace-pre-wrap break-all">
                    {diffEntry.newValue
                      ? tryPrettifyJson(diffEntry.newValue)
                      : "—"}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {diffEntry.oldValue && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-red-600 dark:text-red-400">
                      <Trans>Removed</Trans>
                    </p>
                    <pre className="text-xs font-mono p-3 rounded-lg border bg-red-50/50 dark:bg-red-950/20 overflow-auto max-h-[40vh] whitespace-pre-wrap break-all">
                      {tryPrettifyJson(diffEntry.oldValue)}
                    </pre>
                  </div>
                )}
                {diffEntry.newValue && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-green-600 dark:text-green-400">
                      <Trans>Added</Trans>
                    </p>
                    <pre className="text-xs font-mono p-3 rounded-lg border bg-green-50/50 dark:bg-green-950/20 overflow-auto max-h-[40vh] whitespace-pre-wrap break-all">
                      {tryPrettifyJson(diffEntry.newValue)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </ResponsiveModal>
      )}
    </>
  );
};
