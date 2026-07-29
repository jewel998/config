import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronRight,
  GitCompare,
  Layers,
  Lock,
  Pencil,
  Plus,
  Search,
  Trash2,
  Unlock,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfigFormModal } from "@/components/config-form-modal";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ValuePreview, getFullValue } from "@/components/value-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { useEnvironments } from "@/hooks/use-environments";
import { CONFIG_TEMPLATES } from "@/lib/constants";
import { useProjectStore } from "@/stores/project-store";

type ValueType = ConfigEntry["valueType"];

const FILTER_TYPES: Array<ValueType | "all"> = [
  "all",
  "string",
  "number",
  "boolean",
  "json",
  "array",
];

const ConfigsPage = () => {
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
  const selectedEnvironmentId = useProjectStore((s) => s.selectedEnvironmentId);
  const { data: environments = [], isLoading: envsLoading } =
    useEnvironments(selectedProjectId);

  const envId = selectedEnvironmentId;
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ConfigEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<ValueType | "all">("all");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const { data: configs = [], isLoading: configsLoading } = useConfigs(
    selectedProjectId,
    envId,
  );

  const deleteConfig = useDeleteConfig();
  const toggleLock = useToggleConfigLock();
  const setConfigForUndo = useSetConfig();
  const promoteConfigs = usePromoteConfigs();

  const currentEnv = environments.find((e) => e.id === envId);
  const isProductionEnv = currentEnv?.isProduction ?? false;

  const filteredConfigs = configs.filter((c) => {
    const matchesSearch =
      !searchQuery || c.key.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || c.valueType === filterType;
    return matchesSearch && matchesType;
  });

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
    <div className="space-y-6">
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
                setShowForm(true);
              }}
              disabled={!envId}
            >
              <Plus className="h-4 w-4" />
              <Trans>Add Config</Trans>
            </Button>
          </>
        }
      />

      {/* Toolbar: search + type filter */}
      {environments.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t`Search configs...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
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
            if (!open) setEditingConfig(null);
          }}
          projectId={selectedProjectId}
          environmentId={envId}
          editingConfig={editingConfig}
          isProductionEnv={isProductionEnv}
        />
      )}

      {/* Table */}
      {envId && (
        <>
          {configsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
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
            <div className="rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>
                      <Trans>Key</Trans>
                    </TableHead>
                    <TableHead>
                      <Trans>Type</Trans>
                    </TableHead>
                    <TableHead>
                      <Trans>Value</Trans>
                    </TableHead>
                    <TableHead>
                      <Trans>Updated</Trans>
                    </TableHead>
                    <TableHead className="w-28">
                      <Trans>Actions</Trans>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConfigs.map((config) => (
                    <>
                      <TableRow
                        key={config.key}
                        className="cursor-pointer"
                        onClick={() =>
                          setExpandedKey(
                            expandedKey === config.key ? null : config.key,
                          )
                        }
                      >
                        <TableCell>
                          {expandedKey === config.key ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm font-medium">
                          {config.key}
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
                          {config.updatedAt
                            ? new Date(config.updatedAt).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full"
                                  onClick={() => handleToggleLock(config)}
                                  aria-label={
                                    config.locked ? t`Unlock` : t`Lock`
                                  }
                                >
                                  {config.locked ? (
                                    <Lock className="h-3.5 w-3.5" />
                                  ) : (
                                    <Unlock className="h-3.5 w-3.5 text-muted-foreground" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {config.locked ? t`Unlock` : t`Lock`}
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full"
                                  onClick={() => {
                                    setEditingConfig(config);
                                    setShowForm(true);
                                  }}
                                  disabled={config.locked}
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
                                  className="h-8 w-8 rounded-full text-destructive hover:text-destructive"
                                  onClick={() => handleDelete(config.key)}
                                  disabled={
                                    deleteConfig.isPending || config.locked
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
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedKey === config.key && (
                        <TableRow key={`${config.key}-expanded`}>
                          <TableCell colSpan={6} className="bg-muted/30 p-4">
                            <pre className="max-h-48 overflow-auto rounded-xl border bg-background p-4 font-mono text-xs">
                              {getFullValue(config)}
                            </pre>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export const Route = createFileRoute("/configs")({
  component: ConfigsPage,
});
