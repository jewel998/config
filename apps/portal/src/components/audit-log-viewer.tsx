import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import {
  ArrowLeftRight,
  ChevronRight,
  History,
  Rows3,
  User,
} from "lucide-react";
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

// ─── Constants ────────────────────────────────────────────────

const ACTION_COLORS: Record<string, string> = {
  create:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  update:
    "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  delete:
    "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
  state_change:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  data_deletion:
    "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800",
};

const ACTION_ICONS: Record<string, string> = {
  create: "+",
  update: "~",
  delete: "×",
  state_change: "↻",
  data_deletion: "⊘",
};

const ACTION_LABELS: Record<string, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  state_change: "State changed",
  data_deletion: "Data deleted",
};

// ─── Diff Utilities ───────────────────────────────────────────

function tryParseJson(raw: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function flattenObject(obj: unknown, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  if (obj === null || obj === undefined) return result;
  if (typeof obj !== "object") {
    result[prefix || "(value)"] = String(obj);
    return result;
  }
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      Object.assign(result, flattenObject(obj[i], `${prefix}[${i}]`));
    }
    return result;
  }
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null) {
      Object.assign(result, flattenObject(value, path));
    } else {
      result[path] = JSON.stringify(value);
    }
  }
  return result;
}

interface DiffLine {
  key: string;
  type: "added" | "removed" | "changed" | "unchanged";
  oldValue?: string;
  newValue?: string;
}

function computeDiff(
  oldRaw: string | undefined,
  newRaw: string | undefined,
): DiffLine[] {
  const oldObj = oldRaw ? tryParseJson(oldRaw) : null;
  const newObj = newRaw ? tryParseJson(newRaw) : null;

  // If both can't be parsed as JSON, show raw diff
  if (oldObj === null && newObj === null) {
    const lines: DiffLine[] = [];
    if (oldRaw)
      lines.push({ key: "(value)", type: "removed", oldValue: oldRaw });
    if (newRaw) lines.push({ key: "(value)", type: "added", newValue: newRaw });
    return lines;
  }

  const oldFlat = oldObj ? flattenObject(oldObj) : {};
  const newFlat = newObj ? flattenObject(newObj) : {};
  const allKeys = new Set([...Object.keys(oldFlat), ...Object.keys(newFlat)]);
  const lines: DiffLine[] = [];

  for (const key of allKeys) {
    const o = oldFlat[key];
    const n = newFlat[key];
    if (o === undefined && n !== undefined) {
      lines.push({ key, type: "added", newValue: n });
    } else if (o !== undefined && n === undefined) {
      lines.push({ key, type: "removed", oldValue: o });
    } else if (o !== n) {
      lines.push({ key, type: "changed", oldValue: o, newValue: n });
    } else {
      lines.push({ key, type: "unchanged", oldValue: o, newValue: n });
    }
  }

  // Sort: changed/added/removed first, unchanged last
  const order = { changed: 0, added: 1, removed: 2, unchanged: 3 };
  lines.sort((a, b) => order[a.type] - order[b.type]);
  return lines;
}

// ─── Skeleton ─────────────────────────────────────────────────

const EntrySkeleton = () => (
  <div className="flex gap-3 p-4 animate-pulse">
    <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="flex items-center gap-2">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="h-4 w-32 rounded bg-muted" />
      </div>
      <div className="h-3 w-48 rounded bg-muted" />
    </div>
    <div className="h-3 w-20 rounded bg-muted shrink-0" />
  </div>
);

// ─── Component ────────────────────────────────────────────────

interface AuditLogViewerProps {
  projectId: string;
}

export const AuditLogViewer = ({ projectId }: AuditLogViewerProps) => {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [diffEntry, setDiffEntry] = useState<AuditEntry | null>(null);
  const [diffMode, setDiffMode] = useState<"side-by-side" | "unified">(
    "unified",
  );
  const [showUnchanged, setShowUnchanged] = useState(false);

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

  const actorIds = useMemo(
    () => [...new Set(entries.map((e) => e.actorId))],
    [entries],
  );
  const { data: profiles = {} } = useUserProfiles(actorIds);

  const filtered = useMemo(() => {
    let result = entries;
    if (searchQuery) {
      result = result.filter((e) =>
        e.resourcePath.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }
    if (categoryFilter !== "all") {
      result = result.filter(
        (e) => getResourceCategory(e.resourcePath) === categoryFilter,
      );
    }
    return result;
  }, [entries, searchQuery, categoryFilter]);

  // Infinite scroll
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();
      if (!node) return;
      observerRef.current = new IntersectionObserver(
        (observed) => {
          if (
            observed[0].isIntersecting &&
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
    if (parts[0] === "segments") return "segment";
    return parts[parts.length - 1] || path;
  };

  const getResourceCategory = (path: string): string => {
    if (path.includes("configs")) return "config";
    if (path.includes("segments")) return "segment";
    if (path.includes("apiKeys") || path.includes("clientIds"))
      return "api_key";
    if (path.startsWith("project/")) return "project";
    if (path.includes("team") || path.includes("members")) return "team";
    return "other";
  };

  const getResourceType = (path: string) => {
    const cat = getResourceCategory(path);
    const labels: Record<string, string> = {
      config: "config",
      segment: "segment",
      api_key: "API key",
      project: "project",
      team: "team",
      other: "resource",
    };
    return labels[cat] ?? "resource";
  };

  const getEnvironmentFromPath = (path: string): string | null => {
    const match = path.match(/environments\/([^/]+)/);
    return match ? match[1] : null;
  };

  const diffLines = useMemo(() => {
    if (!diffEntry) return [];
    return computeDiff(diffEntry.oldValue, diffEntry.newValue);
  }, [diffEntry]);

  const visibleDiffLines = useMemo(() => {
    if (showUnchanged) return diffLines;
    return diffLines.filter((l) => l.type !== "unchanged");
  }, [diffLines, showUnchanged]);

  const unchangedCount = useMemo(
    () => diffLines.filter((l) => l.type === "unchanged").length,
    [diffLines],
  );

  return (
    <>
      <Card className="rounded-xl overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" />
              <Trans>Activity</Trans>
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder={t`Filter...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-sm w-full sm:w-44"
              />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-8 text-sm w-full sm:w-32">
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
                <SelectTrigger className="h-8 text-sm w-full sm:w-32">
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
                <div
                  key={entry.id}
                  className="flex gap-3 px-4 py-3 hover:bg-muted/20 transition-colors group"
                >
                  {/* Action indicator */}
                  <div
                    className={`shrink-0 mt-0.5 h-8 w-8 rounded-full flex items-center justify-center text-sm border ${ACTION_COLORS[entry.action] ?? ""}`}
                  >
                    {ACTION_ICONS[entry.action] ?? "·"}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    {/* Primary line: who did what */}
                    <p className="text-sm">
                      <span className="font-medium text-foreground">
                        {getActorName(entry.actorId)}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {(
                          ACTION_LABELS[entry.action] ?? entry.action
                        ).toLowerCase()}
                      </span>{" "}
                      <span className="font-medium font-mono text-foreground">
                        {formatResourcePath(entry.resourcePath)}
                      </span>
                    </p>

                    {/* Secondary: resource type + env + time */}
                    <p className="text-xs text-muted-foreground">
                      {getResourceType(entry.resourcePath)}
                      {getEnvironmentFromPath(entry.resourcePath) && (
                        <span>
                          {" "}
                          ·{" "}
                          <span className="font-mono">
                            {getEnvironmentFromPath(entry.resourcePath)}
                          </span>
                        </span>
                      )}{" "}
                      · {new Date(entry.timestamp).toLocaleString()}
                    </p>

                    {/* Changes indicator */}
                    {(entry.oldValue || entry.newValue) && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs text-primary/80 hover:text-primary mt-1 transition-colors"
                        onClick={() => setDiffEntry(entry)}
                      >
                        <ChevronRight className="h-3 w-3" />
                        <Trans>View changes</Trans>
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Infinite scroll sentinel — always shimmer */}
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

      {/* ─── Diff Modal ─────────────────────────────────────── */}
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
              {(
                ACTION_LABELS[diffEntry.action] ?? diffEntry.action
              ).toLowerCase()}{" "}
              <span className="font-mono">
                {formatResourcePath(diffEntry.resourcePath)}
              </span>{" "}
              · {new Date(diffEntry.timestamp).toLocaleString()}
            </span>
          }
        >
          <div className="space-y-4">
            {/* Mode toggle */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={diffMode === "unified" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs rounded-full gap-1"
                onClick={() => setDiffMode("unified")}
              >
                <Rows3 className="h-3 w-3" />
                <Trans>Unified</Trans>
              </Button>
              <Button
                variant={diffMode === "side-by-side" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs rounded-full gap-1"
                onClick={() => setDiffMode("side-by-side")}
              >
                <ArrowLeftRight className="h-3 w-3" />
                <Trans>Side by side</Trans>
              </Button>
              {unchangedCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs rounded-full ml-auto"
                  onClick={() => setShowUnchanged(!showUnchanged)}
                >
                  {showUnchanged ? (
                    <Trans>Hide unchanged ({unchangedCount})</Trans>
                  ) : (
                    <Trans>Show unchanged ({unchangedCount})</Trans>
                  )}
                </Button>
              )}
            </div>

            {/* Diff content */}
            {diffMode === "unified" ? (
              <div className="rounded-lg border overflow-hidden font-mono text-xs">
                {visibleDiffLines.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    <Trans>No changes to display</Trans>
                  </p>
                ) : (
                  <div className="divide-y divide-border/50">
                    {visibleDiffLines.map((line, i) => (
                      <div key={i} className="flex">
                        {/* Gutter */}
                        <div
                          className={`w-7 shrink-0 flex items-start justify-center pt-1.5 text-[10px] select-none ${
                            line.type === "added"
                              ? "bg-green-50 dark:bg-green-950/30 text-green-600"
                              : line.type === "removed"
                                ? "bg-red-50 dark:bg-red-950/30 text-red-600"
                                : line.type === "changed"
                                  ? "bg-amber-50 dark:bg-amber-950/30 text-amber-600"
                                  : "bg-muted/30 text-muted-foreground"
                          }`}
                        >
                          {line.type === "added"
                            ? "+"
                            : line.type === "removed"
                              ? "−"
                              : line.type === "changed"
                                ? "~"
                                : " "}
                        </div>
                        {/* Content */}
                        <div
                          className={`flex-1 px-3 py-1.5 overflow-x-auto ${
                            line.type === "added"
                              ? "bg-green-50/50 dark:bg-green-950/20"
                              : line.type === "removed"
                                ? "bg-red-50/50 dark:bg-red-950/20"
                                : line.type === "changed"
                                  ? "bg-amber-50/50 dark:bg-amber-950/20"
                                  : ""
                          }`}
                        >
                          <span className="text-muted-foreground mr-2">
                            {line.key}:
                          </span>
                          {line.type === "changed" ? (
                            <span>
                              <span className="line-through text-red-600 dark:text-red-400">
                                {line.oldValue}
                              </span>
                              <span className="mx-1.5">→</span>
                              <span className="text-green-600 dark:text-green-400">
                                {line.newValue}
                              </span>
                            </span>
                          ) : line.type === "removed" ? (
                            <span className="text-red-600 dark:text-red-400">
                              {line.oldValue}
                            </span>
                          ) : line.type === "added" ? (
                            <span className="text-green-600 dark:text-green-400">
                              {line.newValue}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              {line.oldValue}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Side-by-side mode */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    <Trans>Before</Trans>
                  </div>
                  <div className="rounded-lg border bg-red-50/30 dark:bg-red-950/10 overflow-auto max-h-[50vh]">
                    <div className="font-mono text-xs divide-y divide-border/30">
                      {visibleDiffLines
                        .filter((l) => l.type !== "added")
                        .map((line, i) => (
                          <div
                            key={i}
                            className={`px-3 py-1 ${
                              line.type === "removed" || line.type === "changed"
                                ? "bg-red-100/50 dark:bg-red-900/20"
                                : ""
                            }`}
                          >
                            <span className="text-muted-foreground">
                              {line.key}:{" "}
                            </span>
                            <span
                              className={
                                line.type === "removed" ||
                                line.type === "changed"
                                  ? "text-red-700 dark:text-red-300"
                                  : "text-muted-foreground"
                              }
                            >
                              {line.oldValue ?? "—"}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    <Trans>After</Trans>
                  </div>
                  <div className="rounded-lg border bg-green-50/30 dark:bg-green-950/10 overflow-auto max-h-[50vh]">
                    <div className="font-mono text-xs divide-y divide-border/30">
                      {visibleDiffLines
                        .filter((l) => l.type !== "removed")
                        .map((line, i) => (
                          <div
                            key={i}
                            className={`px-3 py-1 ${
                              line.type === "added" || line.type === "changed"
                                ? "bg-green-100/50 dark:bg-green-900/20"
                                : ""
                            }`}
                          >
                            <span className="text-muted-foreground">
                              {line.key}:{" "}
                            </span>
                            <span
                              className={
                                line.type === "added" || line.type === "changed"
                                  ? "text-green-700 dark:text-green-300"
                                  : "text-muted-foreground"
                              }
                            >
                              {line.newValue ?? "—"}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ResponsiveModal>
      )}
    </>
  );
};
