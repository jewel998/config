import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  ArrowLeftRight,
  Check,
  GitCompare,
  Minus,
  Plus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ResponsiveModal } from "@/components/responsive-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  useConfigs,
  usePromoteConfigs,
  type ConfigEntry,
} from "@/hooks/use-configs";
import { useEnvironments } from "@/hooks/use-environments";
import { useProjectStore } from "@/stores/project-store";

type DiffStatus = "added" | "removed" | "changed" | "identical";
type SyncDirection = "to-target" | "to-source";

interface DiffRow {
  key: string;
  status: DiffStatus;
  sourceValue?: unknown;
  sourceType?: ConfigEntry["valueType"];
  targetValue?: unknown;
  targetType?: ConfigEntry["valueType"];
}

const statusColors: Record<DiffStatus, string> = {
  added: "bg-green-50 dark:bg-green-950/20",
  removed: "bg-red-50 dark:bg-red-950/20",
  changed: "bg-amber-50 dark:bg-amber-950/20",
  identical: "",
};

const statusBadge: Record<
  DiffStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  added: { label: "New", variant: "default" },
  removed: { label: "Missing", variant: "destructive" },
  changed: { label: "Changed", variant: "secondary" },
  identical: { label: "Same", variant: "outline" },
};

const formatValue = (value: unknown): string => {
  if (value === undefined || value === null) return "—";
  if (typeof value === "string")
    return value.length > 40 ? value.slice(0, 40) + "…" : value;
  return JSON.stringify(value).slice(0, 40);
};

const ComparePage = () => {
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
  const selectedEnvironmentId = useProjectStore((s) => s.selectedEnvironmentId);
  const { data: environments = [], isLoading: envsLoading } =
    useEnvironments(selectedProjectId);
  const promoteConfigs = usePromoteConfigs();

  const [sourceEnvId, setSourceEnvId] = useState<string>("");
  const [targetEnvId, setTargetEnvId] = useState<string>("");
  const [actions, setActions] = useState<Map<string, SyncDirection>>(new Map());
  const [showIdentical, setShowIdentical] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Default the source (from) environment to the currently selected environment
  useEffect(() => {
    if (selectedEnvironmentId && !sourceEnvId) {
      setSourceEnvId(selectedEnvironmentId);
    }
  }, [selectedEnvironmentId, sourceEnvId]);

  const swapEnvironments = () => {
    setSourceEnvId(targetEnvId);
    setTargetEnvId(sourceEnvId);
    setActions(new Map());
  };

  const { data: sourceConfigs = [], isLoading: sourceLoading } = useConfigs(
    selectedProjectId,
    sourceEnvId || null,
  );
  const { data: targetConfigs = [], isLoading: targetLoading } = useConfigs(
    selectedProjectId,
    targetEnvId || null,
  );

  const sourceEnvName =
    environments.find((e) => e.id === sourceEnvId)?.name ?? "Source";
  const targetEnvName =
    environments.find((e) => e.id === targetEnvId)?.name ?? "Target";

  const diff = useMemo((): DiffRow[] => {
    if (!sourceEnvId || !targetEnvId) return [];

    const sourceMap = new Map(sourceConfigs.map((c) => [c.key, c]));
    const targetMap = new Map(targetConfigs.map((c) => [c.key, c]));
    const allKeys = new Set([...sourceMap.keys(), ...targetMap.keys()]);

    const rows: DiffRow[] = [];
    for (const key of allKeys) {
      const src = sourceMap.get(key);
      const tgt = targetMap.get(key);

      if (src && !tgt) {
        rows.push({
          key,
          status: "added",
          sourceValue: src.value,
          sourceType: src.valueType,
        });
      } else if (!src && tgt) {
        rows.push({
          key,
          status: "removed",
          targetValue: tgt.value,
          targetType: tgt.valueType,
        });
      } else if (src && tgt) {
        const srcStr = JSON.stringify(src.value);
        const tgtStr = JSON.stringify(tgt.value);
        if (srcStr !== tgtStr || src.valueType !== tgt.valueType) {
          rows.push({
            key,
            status: "changed",
            sourceValue: src.value,
            sourceType: src.valueType,
            targetValue: tgt.value,
            targetType: tgt.valueType,
          });
        } else {
          rows.push({
            key,
            status: "identical",
            sourceValue: src.value,
            sourceType: src.valueType,
            targetValue: tgt.value,
            targetType: tgt.valueType,
          });
        }
      }
    }

    const order: Record<DiffStatus, number> = {
      changed: 0,
      added: 1,
      removed: 2,
      identical: 3,
    };
    return rows.sort((a, b) => order[a.status] - order[b.status]);
  }, [sourceConfigs, targetConfigs, sourceEnvId, targetEnvId]);

  const visibleDiff = showIdentical
    ? diff
    : diff.filter((r) => r.status !== "identical");
  const identicalCount = diff.filter((r) => r.status === "identical").length;

  const toggleAction = (key: string, direction: SyncDirection) => {
    setActions((prev) => {
      const next = new Map(prev);
      if (next.get(key) === direction) {
        next.delete(key);
      } else {
        next.set(key, direction);
      }
      return next;
    });
  };

  // Preview data
  const toTargetPreview = useMemo(() => {
    return [...actions.entries()]
      .filter(([, dir]) => dir === "to-target")
      .map(([key]) => diff.find((r) => r.key === key)!)
      .filter((r) => r && r.sourceValue !== undefined)
      .map((r) => ({
        key: r.key,
        value: r.sourceValue!,
        valueType: r.sourceType!,
      }));
  }, [actions, diff]);

  const toSourcePreview = useMemo(() => {
    return [...actions.entries()]
      .filter(([, dir]) => dir === "to-source")
      .map(([key]) => diff.find((r) => r.key === key)!)
      .filter((r) => r && r.targetValue !== undefined)
      .map((r) => ({
        key: r.key,
        value: r.targetValue!,
        valueType: r.targetType!,
      }));
  }, [actions, diff]);

  const handleApply = async () => {
    if (!selectedProjectId) return;

    const toTarget = [...actions.entries()]
      .filter(([, dir]) => dir === "to-target")
      .map(([key]) => diff.find((r) => r.key === key)!)
      .filter((r) => r && r.sourceValue !== undefined)
      .map((r) => ({
        key: r.key,
        value: r.sourceValue!,
        valueType: r.sourceType!,
      }));

    const toSource = [...actions.entries()]
      .filter(([, dir]) => dir === "to-source")
      .map(([key]) => diff.find((r) => r.key === key)!)
      .filter((r) => r && r.targetValue !== undefined)
      .map((r) => ({
        key: r.key,
        value: r.targetValue!,
        valueType: r.targetType!,
      }));

    try {
      if (toTarget.length > 0) {
        await promoteConfigs.mutateAsync({
          projectId: selectedProjectId,
          targetEnvId,
          configs: toTarget,
        });
      }
      if (toSource.length > 0) {
        await promoteConfigs.mutateAsync({
          projectId: selectedProjectId,
          targetEnvId: sourceEnvId,
          configs: toSource,
        });
      }

      toast.success(t`Synced ${toTarget.length + toSource.length} configs`);
      setActions(new Map());
      setShowPreview(false);
    } catch {
      toast.error(t`Failed to sync configs`);
    }
  };

  if (!selectedProjectId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <div className="rounded-full bg-muted p-4">
          <GitCompare className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          <Trans>Select a project to compare environments.</Trans>
        </p>
      </div>
    );
  }

  if (envsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          <Trans>Compare Environments</Trans>
        </h1>
        <p className="text-sm text-muted-foreground">
          <Trans>Diff configs between environments and sync changes.</Trans>
        </p>
      </div>

      {/* Environment selectors */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select
          value={sourceEnvId}
          onValueChange={(v) => {
            setSourceEnvId(v);
            setActions(new Map());
          }}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t`Source`} />
          </SelectTrigger>
          <SelectContent>
            {environments.map((env) => (
              <SelectItem
                key={env.id}
                value={env.id}
                disabled={env.id === targetEnvId}
              >
                {env.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ArrowRight className="mx-2 hidden h-4 w-4 text-muted-foreground sm:block" />

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 rounded-full p-0"
          onClick={swapEnvironments}
          disabled={!sourceEnvId && !targetEnvId}
          aria-label={t`Swap environments`}
        >
          <ArrowLeftRight className="h-4 w-4" />
        </Button>

        <Select
          value={targetEnvId}
          onValueChange={(v) => {
            setTargetEnvId(v);
            setActions(new Map());
          }}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t`Target`} />
          </SelectTrigger>
          <SelectContent>
            {environments.map((env) => (
              <SelectItem
                key={env.id}
                value={env.id}
                disabled={env.id === sourceEnvId}
              >
                {env.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loading */}
      {(sourceLoading || targetLoading) && sourceEnvId && targetEnvId && (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {/* No envs selected */}
      {(!sourceEnvId || !targetEnvId) && (
        <Card className="rounded-xl">
          <CardContent className="py-12 text-center">
            <GitCompare className="mx-auto mb-4 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              <Trans>
                Select a source and target environment to see the diff.
              </Trans>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Diff results */}
      {sourceEnvId && targetEnvId && !sourceLoading && !targetLoading && (
        <>
          {/* Summary bar */}
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="default" className="rounded-full gap-1">
              <Plus className="h-3 w-3" />
              {diff.filter((r) => r.status === "added").length}{" "}
              <Trans>new</Trans>
            </Badge>
            <Badge variant="secondary" className="rounded-full gap-1">
              <Minus className="h-3 w-3" />
              {diff.filter((r) => r.status === "changed").length}{" "}
              <Trans>changed</Trans>
            </Badge>
            <Badge variant="outline" className="rounded-full gap-1">
              <Check className="h-3 w-3" />
              {identicalCount} <Trans>identical</Trans>
            </Badge>

            <div className="flex-1" />

            {identicalCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-xs"
                onClick={() => setShowIdentical(!showIdentical)}
              >
                {showIdentical ? (
                  <Trans>Hide identical</Trans>
                ) : (
                  <Trans>Show identical</Trans>
                )}
              </Button>
            )}
          </div>

          {/* Diff table */}
          {visibleDiff.length === 0 ? (
            <Card className="rounded-xl">
              <CardContent className="py-12 text-center">
                <Check className="mx-auto mb-4 h-8 w-8 text-emerald-500" />
                <p className="font-medium">
                  <Trans>Environments are in sync</Trans>
                </p>
                <p className="text-sm text-muted-foreground">
                  <Trans>
                    No differences found between these environments.
                  </Trans>
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-xl overflow-hidden">
              <CardHeader className="pb-0">
                <CardTitle className="text-base">
                  <Trans>Config Differences</Trans>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 pt-4">
                <div className="divide-y">
                  {visibleDiff.map((row) => (
                    <div
                      key={row.key}
                      className={`flex items-center gap-3 px-6 py-3 ${statusColors[row.status]}`}
                    >
                      {/* Direction arrows */}
                      <div className="flex shrink-0 gap-1">
                        {(row.status === "added" ||
                          row.status === "changed") && (
                          <Button
                            variant={
                              actions.get(row.key) === "to-target"
                                ? "default"
                                : "ghost"
                            }
                            size="sm"
                            className="h-6 w-6 rounded-full p-0"
                            onClick={() => toggleAction(row.key, "to-target")}
                            aria-label="Push to target"
                          >
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        )}
                        {(row.status === "removed" ||
                          row.status === "changed") && (
                          <Button
                            variant={
                              actions.get(row.key) === "to-source"
                                ? "default"
                                : "ghost"
                            }
                            size="sm"
                            className="h-6 w-6 rounded-full p-0"
                            onClick={() => toggleAction(row.key, "to-source")}
                            aria-label="Pull to source"
                          >
                            <ArrowLeft className="h-3 w-3" />
                          </Button>
                        )}
                        {row.status === "identical" && <div className="w-6" />}
                      </div>

                      {/* Key */}
                      <span className="min-w-0 flex-1 truncate font-mono text-sm font-medium">
                        {row.key}
                      </span>

                      {/* Status badge */}
                      <Badge
                        variant={statusBadge[row.status].variant}
                        className="shrink-0 rounded-full text-xs"
                      >
                        {statusBadge[row.status].label}
                      </Badge>

                      {/* Values */}
                      <div className="hidden w-64 shrink-0 sm:flex sm:items-center sm:gap-2">
                        {row.sourceValue !== undefined && (
                          <code className="truncate rounded bg-muted px-1.5 py-0.5 text-xs">
                            {formatValue(row.sourceValue)}
                          </code>
                        )}
                        {row.status === "changed" && (
                          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                        )}
                        {(row.status === "changed" ||
                          row.status === "removed") &&
                          row.targetValue !== undefined && (
                            <code className="truncate rounded bg-muted px-1.5 py-0.5 text-xs">
                              {formatValue(row.targetValue)}
                            </code>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Review Changes button */}
          {actions.size > 0 && (
            <div className="sticky bottom-4 flex justify-end">
              <Button
                className="min-w-40 gap-2 rounded-full shadow-lg"
                onClick={() => setShowPreview(true)}
              >
                <Trans>Review {actions.size} changes</Trans>
              </Button>
            </div>
          )}
        </>
      )}

      {/* Preview / Confirm Modal */}
      <ResponsiveModal
        open={showPreview}
        onOpenChange={setShowPreview}
        title={<Trans>Confirm Sync</Trans>}
        description={<Trans>The following changes will be applied:</Trans>}
      >
        <div className="max-h-[50vh] space-y-4 overflow-y-auto">
          {toTargetPreview.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">
                → Writing to {targetEnvName}:
              </p>
              <div className="space-y-1">
                {toTargetPreview.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2"
                  >
                    <span className="font-mono text-xs font-medium">
                      {item.key}
                    </span>
                    <Badge
                      variant="outline"
                      className="rounded-full text-[10px]"
                    >
                      {item.valueType}
                    </Badge>
                    <code className="ml-auto max-w-32 truncate text-xs text-muted-foreground">
                      {formatValue(item.value)}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          )}
          {toSourcePreview.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">
                ← Writing to {sourceEnvName}:
              </p>
              <div className="space-y-1">
                {toSourcePreview.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2"
                  >
                    <span className="font-mono text-xs font-medium">
                      {item.key}
                    </span>
                    <Badge
                      variant="outline"
                      className="rounded-full text-[10px]"
                    >
                      {item.valueType}
                    </Badge>
                    <code className="ml-auto max-w-32 truncate text-xs text-muted-foreground">
                      {formatValue(item.value)}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => setShowPreview(false)}
          >
            <Trans>Cancel</Trans>
          </Button>
          <Button
            className="min-w-32 rounded-full"
            onClick={handleApply}
            disabled={promoteConfigs.isPending}
          >
            {promoteConfigs.isPending ? (
              <Spinner />
            ) : (
              <Trans>Apply {actions.size} changes</Trans>
            )}
          </Button>
        </div>
      </ResponsiveModal>
    </div>
  );
};

export const Route = createFileRoute("/compare")({
  component: ComparePage,
});
