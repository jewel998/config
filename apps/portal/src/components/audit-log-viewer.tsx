import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { History, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { AuditDiffViewer } from "@/components/audit-diff-viewer";
import { AuditEntryRow } from "@/components/audit-entry-row";
import { ResponsiveModal } from "@/components/responsive-modal";
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
import { useEnvironments } from "@/hooks/use-environments";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useUserProfiles } from "@/hooks/use-user-profiles";
import {
  ACTION_LABELS,
  formatResourceName,
  getResourceCategory,
} from "@/lib/audit-utils";
import type { AuditEntry } from "@/lib/types";

// ─── Skeleton ─────────────────────────────────────────────────

const EntrySkeleton = () => (
  <div className="flex gap-3 px-4 py-3 animate-pulse">
    <div className="h-8 w-8 rounded-lg bg-muted shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-4 w-3/4 rounded bg-muted" />
      <div className="h-3 w-1/2 rounded bg-muted" />
    </div>
  </div>
);

// ─── Component ────────────────────────────────────────────────

interface AuditLogViewerProps {
  projectId: string;
}

export const AuditLogViewer = ({ projectId }: AuditLogViewerProps) => {
  const queryClient = useQueryClient();
  const [actionFilter, setActionFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [diffEntry, setDiffEntry] = useState<AuditEntry | null>(null);

  const filters = useMemo(
    () => (actionFilter !== "all" ? { action: actionFilter } : undefined),
    [actionFilter],
  );

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useAuditLog(projectId, filters);

  const { data: environments = [] } = useEnvironments(projectId);
  const envMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const env of environments) map[env.id] = env.name;
    return map;
  }, [environments]);

  const entries = useMemo(
    () => data?.pages.flatMap((p) => p.entries) ?? [],
    [data],
  );
  const actorIds = useMemo(
    () => [...new Set(entries.map((e) => e.actorId))],
    [entries],
  );
  const { data: profiles = {} } = useUserProfiles(actorIds);

  const filtered = useMemo(() => {
    let result = entries;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) => e.resourcePath.toLowerCase().includes(q));
    }
    if (categoryFilter !== "all") {
      result = result.filter(
        (e) => getResourceCategory(e.resourcePath) === categoryFilter,
      );
    }
    return result;
  }, [entries, searchQuery, categoryFilter]);

  const sentinelRef = useInfiniteScroll(
    hasNextPage ?? false,
    isFetchingNextPage,
    fetchNextPage,
  );

  const getActorName = (actorId: string) => {
    const profile = profiles[actorId];
    return profile?.displayName || profile?.email || actorId.slice(0, 8) + "…";
  };

  return (
    <>
      <Card className="rounded-xl overflow-hidden py-0">
        <CardHeader className="border-b bg-muted/20 px-4 py-3 space-y-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <History className="h-4 w-4 text-muted-foreground" />
            <Trans>Activity</Trans>
            <Button
              variant="ghost"
              size="icon-xs"
              className="ml-auto"
              onClick={() =>
                queryClient.invalidateQueries({
                  queryKey: ["audit_log", projectId],
                })
              }
            >
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder={t`Search...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-sm flex-1 sm:max-w-44"
            />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 text-sm w-full sm:w-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t`All resources`}</SelectItem>
                <SelectItem value="config">{t`Configs`}</SelectItem>
                <SelectItem value="segment">{t`Segments`}</SelectItem>
                <SelectItem value="api_key">{t`API Keys`}</SelectItem>
                <SelectItem value="project">{t`Project`}</SelectItem>
                <SelectItem value="team">{t`Team`}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-8 text-sm w-full sm:w-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t`All actions`}</SelectItem>
                <SelectItem value="create">{t`Created`}</SelectItem>
                <SelectItem value="update">{t`Updated`}</SelectItem>
                <SelectItem value="delete">{t`Deleted`}</SelectItem>
                <SelectItem value="state_change">{t`State change`}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              <EntrySkeleton />
              <EntrySkeleton />
              <EntrySkeleton />
              <EntrySkeleton />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <History className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">
                <Trans>No activity yet</Trans>
              </p>
            </div>
          ) : (
            <div className="divide-y max-h-[75vh] overflow-y-auto">
              {filtered.map((entry) => (
                <AuditEntryRow
                  key={entry.id}
                  entry={entry}
                  actorName={getActorName(entry.actorId)}
                  envMap={envMap}
                  onViewChanges={
                    entry.oldValue || entry.newValue
                      ? () => setDiffEntry(entry)
                      : undefined
                  }
                />
              ))}
              <div ref={sentinelRef}>
                {hasNextPage && (
                  <>
                    <EntrySkeleton />
                    <EntrySkeleton />
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diff Modal */}
      {diffEntry && (
        <ResponsiveModal
          open={!!diffEntry}
          onOpenChange={(open) => !open && setDiffEntry(null)}
          title={<Trans>Change Details</Trans>}
          description={
            <span className="text-xs text-muted-foreground">
              <span className="font-medium">
                {getActorName(diffEntry.actorId)}
              </span>{" "}
              {ACTION_LABELS[diffEntry.action] ?? diffEntry.action}{" "}
              <span className="font-mono">
                {formatResourceName(diffEntry.resourcePath)}
              </span>
            </span>
          }
        >
          <AuditDiffViewer
            oldValue={diffEntry.oldValue}
            newValue={diffEntry.newValue}
          />
        </ResponsiveModal>
      )}
    </>
  );
};
