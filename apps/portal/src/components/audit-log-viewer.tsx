import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import {
  ArrowLeftRight,
  ChevronRight,
  FilePlus2,
  FileX2,
  History,
  Key,
  Layers,
  Pencil,
  RefreshCw,
  Rows3,
  Trash2,
  Users,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { DateDisplay } from "@/components/date-display";
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
import { useEnvironments } from "@/hooks/use-environments";
import { useUserProfiles } from "@/hooks/use-user-profiles";
import type { AuditEntry } from "@/lib/types";

// ─── Resource Categories ──────────────────────────────────────

type ResourceCategory =
  "config" | "segment" | "api_key" | "project" | "team" | "other";

const CATEGORY_CONFIG: Record<
  ResourceCategory,
  { label: string; color: string; icon: LucideIcon }
> = {
  config: {
    label: "Config",
    color: "bg-secondary text-secondary-foreground",
    icon: Layers,
  },
  segment: {
    label: "Segment",
    color: "bg-secondary text-secondary-foreground",
    icon: Users,
  },
  api_key: {
    label: "API Key",
    color: "bg-secondary text-secondary-foreground",
    icon: Key,
  },
  project: {
    label: "Project",
    color: "bg-secondary text-secondary-foreground",
    icon: Layers,
  },
  team: {
    label: "Team",
    color: "bg-secondary text-secondary-foreground",
    icon: Users,
  },
  other: {
    label: "Other",
    color: "bg-secondary text-secondary-foreground",
    icon: History,
  },
};

const ACTION_ICONS: Record<string, LucideIcon> = {
  create: FilePlus2,
  update: Pencil,
  delete: Trash2,
  state_change: RefreshCw,
  data_deletion: FileX2,
};

const ACTION_COLORS: Record<string, string> = {
  create: "text-emerald-700/80 dark:text-emerald-300/80 bg-emerald-500/8",
  update: "text-blue-700/80 dark:text-blue-300/80 bg-blue-500/8",
  delete: "text-red-700/80 dark:text-red-300/80 bg-red-500/8",
  state_change: "text-amber-700/80 dark:text-amber-300/80 bg-amber-500/8",
  data_deletion: "text-purple-700/80 dark:text-purple-300/80 bg-purple-500/8",
};

const ACTION_LABELS: Record<string, string> = {
  create: "created",
  update: "updated",
  delete: "deleted",
  state_change: "changed state of",
  data_deletion: "deleted data from",
};

// ─── Utilities ────────────────────────────────────────────────

function getResourceCategory(path: string): ResourceCategory {
  if (path.includes("configs")) return "config";
  if (path.includes("segments")) return "segment";
  if (path.includes("apiKeys") || path.includes("clientIds")) return "api_key";
  if (path.startsWith("project/") || path === "project") return "project";
  if (path.includes("team") || path.includes("members")) return "team";
  return "other";
}

function formatResourceName(path: string): string {
  const parts = path.split("/");
  // configs: "environments/prod/configs/feature.darkMode" → "feature.darkMode"
  if (parts.includes("configs") && parts.length >= 4)
    return parts[parts.length - 1];
  // API keys: "environments/prod/apiKeys/cid_abc12345" → "API key …abc12345"
  if (parts.includes("apiKeys") && parts.length >= 4) {
    const keyId = parts[parts.length - 1];
    return keyId.startsWith("cid_") ? `API key …${keyId.slice(-6)}` : keyId;
  }
  // Segments
  if (parts[0] === "segments") return "segment";
  // Project
  if (parts[0] === "project") return "project settings";
  // Team members: "team/members/John Doe"
  if (parts[0] === "team" && parts[1] === "members")
    return parts[2] ?? "member";
  // Team invites: "team/invites/user@example.com"
  if (parts[0] === "team" && parts[1] === "invites")
    return parts[2] ?? "invite";
  return parts[parts.length - 1] || path;
}

function getEnvironmentFromPath(path: string): string | null {
  const match = path.match(/environments\/([^/]+)/);
  return match ? match[1] : null;
}

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
    for (let i = 0; i < obj.length; i++)
      Object.assign(result, flattenObject(obj[i], `${prefix}[${i}]`));
    return result;
  }
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null)
      Object.assign(result, flattenObject(value, path));
    else result[path] = JSON.stringify(value);
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
    if (o === undefined && n !== undefined)
      lines.push({ key, type: "added", newValue: n });
    else if (o !== undefined && n === undefined)
      lines.push({ key, type: "removed", oldValue: o });
    else if (o !== n)
      lines.push({ key, type: "changed", oldValue: o, newValue: n });
    else lines.push({ key, type: "unchanged", oldValue: o, newValue: n });
  }
  const order = { changed: 0, added: 1, removed: 2, unchanged: 3 };
  lines.sort((a, b) => order[a.type] - order[b.type]);
  return lines;
}

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

  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();
      if (!node) return;
      observerRef.current = new IntersectionObserver(
        (observed) => {
          if (observed[0].isIntersecting && hasNextPage && !isFetchingNextPage)
            fetchNextPage();
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

  const diffLines = useMemo(
    () =>
      diffEntry ? computeDiff(diffEntry.oldValue, diffEntry.newValue) : [],
    [diffEntry],
  );
  const visibleDiffLines = useMemo(
    () =>
      showUnchanged
        ? diffLines
        : diffLines.filter((l) => l.type !== "unchanged"),
    [diffLines, showUnchanged],
  );
  const unchangedCount = useMemo(
    () => diffLines.filter((l) => l.type === "unchanged").length,
    [diffLines],
  );

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
              {filtered.map((entry) => {
                const category = getResourceCategory(entry.resourcePath);
                const catConfig = CATEGORY_CONFIG[category];
                const ActionIcon = ACTION_ICONS[entry.action] ?? History;
                const envName = getEnvironmentFromPath(entry.resourcePath);

                return (
                  <div
                    key={entry.id}
                    className="flex gap-3 px-4 py-3 hover:bg-muted/20 transition-colors [content-visibility:auto] [contain-intrinsic-size:auto_64px]"
                  >
                    {/* Icon */}
                    <div
                      className={`shrink-0 mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center ${ACTION_COLORS[entry.action] ?? ""}`}
                    >
                      <ActionIcon className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      {/* Primary line */}
                      <p className="text-sm leading-snug">
                        <span className="font-medium">
                          {getActorName(entry.actorId)}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          {ACTION_LABELS[entry.action] ?? entry.action}
                        </span>{" "}
                        <span className="font-medium font-mono">
                          {formatResourceName(entry.resourcePath)}
                        </span>
                      </p>

                      {/* Metadata row: category chip + env + timestamp + view changes */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-1.5 py-0 rounded-full ${catConfig.color}`}
                        >
                          {catConfig.label}
                        </Badge>
                        {envName && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 rounded-full font-mono"
                          >
                            {envMap[envName] || envName}
                          </Badge>
                        )}
                        <DateDisplay
                          date={entry.timestamp}
                          className="text-[11px] text-muted-foreground"
                        />
                        {(entry.oldValue || entry.newValue) && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-[11px] text-primary/80 hover:text-primary transition-colors ml-auto"
                            onClick={() => setDiffEntry(entry)}
                          >
                            <ChevronRight className="h-3 w-3" />
                            <Trans>View changes</Trans>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Infinite scroll sentinel */}
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
              {ACTION_LABELS[diffEntry.action] ?? diffEntry.action}{" "}
              <span className="font-mono">
                {formatResourceName(diffEntry.resourcePath)}
              </span>
            </span>
          }
        >
          <div className="space-y-4">
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
                        <div
                          className={`w-7 shrink-0 flex items-start justify-center pt-1.5 text-[10px] select-none ${line.type === "added" ? "bg-green-50 dark:bg-green-950/30 text-green-600" : line.type === "removed" ? "bg-red-50 dark:bg-red-950/30 text-red-600" : line.type === "changed" ? "bg-amber-50 dark:bg-amber-950/30 text-amber-600" : "bg-muted/30 text-muted-foreground"}`}
                        >
                          {line.type === "added"
                            ? "+"
                            : line.type === "removed"
                              ? "−"
                              : line.type === "changed"
                                ? "~"
                                : " "}
                        </div>
                        <div
                          className={`flex-1 px-3 py-1.5 overflow-x-auto ${line.type === "added" ? "bg-green-50/50 dark:bg-green-950/20" : line.type === "removed" ? "bg-red-50/50 dark:bg-red-950/20" : line.type === "changed" ? "bg-amber-50/50 dark:bg-amber-950/20" : ""}`}
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
                            className={`px-3 py-1 ${line.type === "removed" || line.type === "changed" ? "bg-red-100/50 dark:bg-red-900/20" : ""}`}
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
                            className={`px-3 py-1 ${line.type === "added" || line.type === "changed" ? "bg-green-100/50 dark:bg-green-900/20" : ""}`}
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
