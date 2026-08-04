import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  GitCompare,
  Layers,
  Lock,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  Trash2,
  Unlock,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfigDetailPanel } from "@/components/config-detail-panel";
import { ConfigFormModal } from "@/components/config-form-modal";
import { EmptyState } from "@/components/empty-state";
import { Kbd } from "@/components/kbd";
import { PageHeader } from "@/components/page-header";
import { PageLayout } from "@/components/page-layout";
import { ValuePreview } from "@/components/value-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  type ConfigEntry,
  useConfigs,
  useDeleteConfig,
  usePromoteConfigs,
  useSetConfig,
  useToggleConfigLock,
} from "@/hooks/use-configs";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useEnvironments } from "@/hooks/use-environments";
import { usePinnedConfigs } from "@/hooks/use-pinned-configs";
import { CONFIG_TEMPLATES } from "@/lib/constants";
import { getStalenessLevel, getStalenessLabel } from "@/lib/stale-detection";
import { useProjectStore } from "@/stores/project-store";
import { useRBAC } from "@/hooks/use-rbac";
import type { ConfigFlagExtended } from "@/lib/types";

type ValueType = ConfigEntry["valueType"];

const FILTER_TYPES: Array<ValueType | "all"> = [
  "all",
  "string",
  "number",
  "boolean",
  "json",
  "array",
];

const FILTER_STALENESS = ["all", "fresh", "aging", "stale"] as const;
type FilterStaleness = (typeof FILTER_STALENESS)[number];

const PAGE_SIZE = 20;

const ConfigsPage = () => {
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
  const selectedEnvironmentId = useProjectStore((s) => s.selectedEnvironmentId);
  const { data: environments = [], isLoading: envsLoading } =
    useEnvironments(selectedProjectId);

  const envId = selectedEnvironmentId;
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ConfigEntry | null>(null);
  const [duplicatingConfig, setDuplicatingConfig] =
    useState<ConfigEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const [filterType, setFilterType] = useState<ValueType | "all">("all");
  const [filterStaleness, setFilterStaleness] =
    useState<FilterStaleness>("all");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const { data: configs = [], isLoading: configsLoading } = useConfigs(
    selectedProjectId,
    envId,
  );

  const deleteConfig = useDeleteConfig();
  const toggleLock = useToggleConfigLock();
  const setConfigForUndo = useSetConfig();
  const promoteConfigs = usePromoteConfigs();

  const { pinned, isPinned, togglePin } = usePinnedConfigs(
    selectedProjectId,
    envId,
  );

  const currentEnv = environments.find((e) => e.id === envId);
  const isProductionEnv = currentEnv?.isProduction ?? false;
  const { canEditEnvironment, role: userRole } = useRBAC();
  const canEdit = canEditEnvironment(isProductionEnv);

  const filteredConfigs = useMemo(() => {
    const filtered = configs.filter((c) => {
      const matchesSearch =
        !debouncedSearch ||
        c.key.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesType = filterType === "all" || c.valueType === filterType;
      const staleness = getStalenessLevel(c.updatedAt);
      const matchesStaleness =
        filterStaleness === "all" || staleness === filterStaleness;
      return matchesSearch && matchesType && matchesStaleness;
    });

    // Sort: pinned first, then alphabetical
    return filtered.sort((a, b) => {
      const aPinned = pinned.includes(a.key) ? 0 : 1;
      const bPinned = pinned.includes(b.key) ? 0 : 1;
      if (aPinned !== bPinned) return aPinned - bPinned;
      return a.key.localeCompare(b.key);
    });
  }, [configs, debouncedSearch, filterType, filterStaleness, pinned]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredConfigs.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages - 1);
  const paginatedConfigs = filteredConfigs.slice(
    safePage * PAGE_SIZE,
    (safePage + 1) * PAGE_SIZE,
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [debouncedSearch, filterType, filterStaleness, envId]);

  const handleDelete = (key: string) => {
    if (!selectedProjectId || !envId) return;

    if (isProductionEnv) {
      const confirmed = window.confirm(
        t`This is a production environment. Changes will affect live users. Continue?`,
      );
      if (!confirmed) return;
    }

    const config = configs.find((c) => c.key === key);

    deleteConfig.mutate(
      { projectId: selectedProjectId, environmentId: envId, key },
      {
        onSuccess: () => {
          toast.success(t`Config deleted`, {
            action: {
              label: t`Undo`,
              onClick: () => {
                if (config) {
                  setConfigForUndo.mutate({
                    projectId: selectedProjectId!,
                    environmentId: envId!,
                    key: config.key,
                    value: config.value,
                    valueType: config.valueType,
                  });
                }
              },
            },
            duration: 5000,
          });
        },
        onError: () => toast.error(t`Failed to delete config`),
      },
    );
  };

  const handleToggleLock = (config: ConfigEntry) => {
    if (!selectedProjectId || !envId) return;
    toggleLock.mutate({
      projectId: selectedProjectId,
      environmentId: envId,
      key: config.key,
      locked: !config.locked,
    });
  };

  const handleDuplicate = (config: ConfigEntry) => {
    setDuplicatingConfig(config);
    setEditingConfig(null);
    setShowForm(true);
  };

  const applyTemplate = (templateId: string) => {
    if (!selectedProjectId || !envId) return;
    const template = CONFIG_TEMPLATES[templateId];
    if (!template) return;
    promoteConfigs.mutate(
      { projectId: selectedProjectId, targetEnvId: envId, configs: template },
      {
        onSuccess: () => toast.success(t`Template applied`),
        onError: () => toast.error(t`Failed to apply template`),
      },
    );
  };

  // Keyboard shortcuts — use ⌘+N on Mac, Ctrl+N on Windows/Linux
  const openNewConfig = useCallback(() => {
    if (envId) {
      setEditingConfig(null);
      setDuplicatingConfig(null);
      setShowForm(true);
    }
  }, [envId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        openNewConfig();
      }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const active = document.activeElement;
        if (active?.tagName === "INPUT" || active?.tagName === "TEXTAREA")
          return;
        e.preventDefault();
        const searchInput =
          document.querySelector<HTMLInputElement>("input[placeholder]");
        searchInput?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openNewConfig]);

  // Listen for command palette "open-new-config" event
  useEffect(() => {
    const handler = () => openNewConfig();
    window.addEventListener("open-new-config", handler);
    return () => window.removeEventListener("open-new-config", handler);
  }, [openNewConfig]);

  if (!selectedProjectId) {
    return (
      <EmptyState
        icon={Layers}
        message={<Trans>Select a project to manage configs.</Trans>}
      />
    );
  }

  if (envsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  return (
    <PageLayout maxWidth="5xl">
      <PageHeader
        title={<Trans>Configs</Trans>}
        description={
          <Trans>Manage feature flags and configuration values.</Trans>
        }
        actions={
          <>
            <Link to="/compare">
              <Button
                variant="outline"
                className="gap-2 rounded-full"
                size="sm"
              >
                <GitCompare className="h-4 w-4" />
                <span className="hidden sm:inline">
                  <Trans>Compare</Trans>
                </span>
              </Button>
            </Link>
            <Button
              className="gap-2 rounded-full"
              onClick={() => {
                setEditingConfig(null);
                setDuplicatingConfig(null);
                setShowForm(true);
              }}
              disabled={!envId || !canEdit}
            >
              <Plus className="h-4 w-4" />
              <Trans>Add Config</Trans>
              <Kbd keys="meta+n" />
            </Button>
          </>
        }
      />

      {/* Toolbar: search + type filter + staleness filter */}
      {!canEdit && envId && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800/30 dark:bg-amber-950/20 dark:text-amber-200">
          {userRole === "viewer" ? (
            <Trans>You have view-only access to this project.</Trans>
          ) : (
            <Trans>
              This is a production environment. You have read-only access.
            </Trans>
          )}
        </div>
      )}
      {environments.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t`Search configs...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-12"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Kbd keys="/" />
            </div>
          </div>
          <Select
            value={filterType}
            onValueChange={(v) => setFilterType(v as ValueType | "all")}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILTER_TYPES.map((ft) => (
                <SelectItem key={ft} value={ft}>
                  {ft === "all" ? t`All types` : ft}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filterStaleness}
            onValueChange={(v) => setFilterStaleness(v as FilterStaleness)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t`All ages`}</SelectItem>
              <SelectItem value="fresh">{t`Fresh`}</SelectItem>
              <SelectItem value="aging">{t`Aging`}</SelectItem>
              <SelectItem value="stale">{t`Stale`}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {environments.length === 0 && (
        <Card className="rounded-xl">
          <CardContent>
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <div className="rounded-full bg-muted p-4">
                <Layers className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                <Trans>Create an environment first to manage configs.</Trans>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Config Form Modal */}
      {showForm && envId && selectedProjectId && (
        <ConfigFormModal
          open={showForm}
          onOpenChange={(open) => {
            setShowForm(open);
            if (!open) {
              setEditingConfig(null);
              setDuplicatingConfig(null);
            }
          }}
          projectId={selectedProjectId}
          environmentId={envId}
          editingConfig={editingConfig}
          duplicateFrom={duplicatingConfig}
          isProductionEnv={isProductionEnv}
        />
      )}

      {/* Table */}
      {envId && (
        <>
          {configsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-xl" />
              ))}
            </div>
          ) : filteredConfigs.length === 0 && !showForm ? (
            <Card className="rounded-xl">
              <CardContent>
                <div className="flex flex-col items-center justify-center gap-6 py-12">
                  <div className="rounded-full bg-muted p-4">
                    <Layers className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">
                      <Trans>No configs yet</Trans>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <Trans>
                        Get started with a template or create your own.
                      </Trans>
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button
                      variant="outline"
                      className="gap-2 rounded-full"
                      onClick={() => applyTemplate("feature-flags")}
                    >
                      🏁 <Trans>Feature Flags</Trans>
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 rounded-full"
                      onClick={() => applyTemplate("app-settings")}
                    >
                      ⚙️ <Trans>App Settings</Trans>
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 rounded-full"
                      onClick={() => {
                        setEditingConfig(null);
                        setDuplicatingConfig(null);
                        setShowForm(true);
                      }}
                    >
                      <Plus className="h-4 w-4" /> <Trans>Custom</Trans>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead>
                        <Trans>Key</Trans>
                      </TableHead>
                      <TableHead className="w-20">
                        <Trans>Type</Trans>
                      </TableHead>
                      <TableHead>
                        <Trans>Value</Trans>
                      </TableHead>
                      <TableHead className="w-28">
                        <Trans>Updated</Trans>
                      </TableHead>
                      <TableHead className="w-24">
                        <Trans>Actions</Trans>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedConfigs.map((config) => (
                      <>
                        <TableRow
                          key={config.key}
                          className={`cursor-pointer ${isPinned(config.key) ? "bg-primary/5" : ""}`}
                          onClick={() =>
                            setExpandedKey(
                              expandedKey === config.key ? null : config.key,
                            )
                          }
                        >
                          <TableCell className="w-8">
                            {expandedKey === config.key ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm font-medium">
                            <div className="flex items-center gap-2">
                              {isPinned(config.key) && (
                                <Pin className="h-3 w-3 shrink-0 text-primary" />
                              )}
                              {config.locked && (
                                <Lock className="h-3 w-3 shrink-0 text-amber-500" />
                              )}
                              <span
                                className={`truncate ${config.locked ? "text-muted-foreground" : ""}`}
                              >
                                {config.key}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className="rounded-full text-xs"
                            >
                              {config.valueType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <ValuePreview config={config} />
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              {config.updatedAt
                                ? new Date(
                                    config.updatedAt,
                                  ).toLocaleDateString()
                                : "—"}
                              {(() => {
                                const level = getStalenessLevel(
                                  config.updatedAt,
                                );
                                if (level === "fresh") return null;
                                return (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span>
                                        <Clock
                                          className={`h-3 w-3 ${
                                            level === "stale"
                                              ? "text-red-500"
                                              : "text-amber-500"
                                          }`}
                                        />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {getStalenessLabel(level)}
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              })()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div
                              className="flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Primary actions: Edit + Delete */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-full"
                                    onClick={() => {
                                      setEditingConfig(config);
                                      setDuplicatingConfig(null);
                                      setShowForm(true);
                                    }}
                                    disabled={config.locked || !canEdit}
                                    aria-label={t`Edit`}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t`Edit`}</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-full text-destructive hover:text-destructive"
                                    onClick={() => handleDelete(config.key)}
                                    disabled={
                                      deleteConfig.isPending ||
                                      config.locked ||
                                      !canEdit
                                    }
                                    aria-label={t`Delete`}
                                  >
                                    {deleteConfig.isPending ? (
                                      <Spinner />
                                    ) : (
                                      <Trash2 className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t`Delete`}</TooltipContent>
                              </Tooltip>

                              {/* More actions dropdown */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-full"
                                    aria-label={t`More actions`}
                                  >
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => togglePin(config.key)}
                                  >
                                    {isPinned(config.key) ? (
                                      <>
                                        <PinOff className="h-4 w-4" />
                                        <Trans>Unpin</Trans>
                                      </>
                                    ) : (
                                      <>
                                        <Pin className="h-4 w-4" />
                                        <Trans>Pin to top</Trans>
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDuplicate(config)}
                                  >
                                    <Copy className="h-4 w-4" />
                                    <Trans>Duplicate</Trans>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleToggleLock(config)}
                                  >
                                    {config.locked ? (
                                      <>
                                        <Unlock className="h-4 w-4" />
                                        <Trans>Unlock</Trans>
                                      </>
                                    ) : (
                                      <>
                                        <Lock className="h-4 w-4" />
                                        <Trans>Lock</Trans>
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => handleDelete(config.key)}
                                    disabled={config.locked || !canEdit}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <Trans>Delete</Trans>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                        {expandedKey === config.key && (
                          <TableRow key={`${config.key}-expanded`}>
                            <TableCell colSpan={6} className="bg-muted/30 p-4">
                              <ConfigDetailPanel
                                config={config as ConfigFlagExtended}
                                projectId={selectedProjectId!}
                                environmentId={envId!}
                                canEdit={canEdit}
                              />
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {filteredConfigs.length > PAGE_SIZE && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-muted-foreground">
                    <Trans>
                      Showing {safePage * PAGE_SIZE + 1}–
                      {Math.min(
                        (safePage + 1) * PAGE_SIZE,
                        filteredConfigs.length,
                      )}{" "}
                      of {filteredConfigs.length}
                    </Trans>
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 rounded-full p-0"
                      onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                      disabled={safePage === 0}
                      aria-label={t`Previous page`}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="min-w-[4rem] text-center text-xs text-muted-foreground">
                      {safePage + 1} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 rounded-full p-0"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
                      }
                      disabled={safePage >= totalPages - 1}
                      aria-label={t`Next page`}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </PageLayout>
  );
};

export const Route = createFileRoute("/configs")({
  component: ConfigsPage,
});
