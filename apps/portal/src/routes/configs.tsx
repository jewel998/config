import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronRight,
  GitCompare,
  Layers,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ResponsiveModal } from "@/components/responsive-modal";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  type ConfigEntry,
  configKeySchema,
  configValueSchema,
  useConfigs,
  useDeleteConfig,
  useSetConfig,
} from "@/hooks/use-configs";
import { useEnvironments } from "@/hooks/use-environments";
import { useProjectStore } from "@/stores/project-store";

type ValueType = ConfigEntry["valueType"];

const VALUE_TYPES: ValueType[] = [
  "string",
  "number",
  "boolean",
  "json",
  "array",
];

const FILTER_TYPES: Array<ValueType | "all"> = [
  "all",
  "string",
  "number",
  "boolean",
  "json",
  "array",
];

const ValuePreview = ({ config }: { config: ConfigEntry }) => {
  switch (config.valueType) {
    case "boolean":
      return (
        <Badge
          className={`rounded-full text-xs ${
            config.value === true || config.value === "true"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          }`}
        >
          {String(config.value)}
        </Badge>
      );
    case "json": {
      const str =
        typeof config.value === "string"
          ? config.value
          : JSON.stringify(config.value);
      let count = 0;
      try {
        const parsed = JSON.parse(str);
        count = Object.keys(parsed).length;
      } catch {
        /* ignore */
      }
      return (
        <span className="font-mono text-xs text-muted-foreground">
          {`{...}`} <span className="text-[10px]">({count} keys)</span>
        </span>
      );
    }
    case "array": {
      const str =
        typeof config.value === "string"
          ? config.value
          : JSON.stringify(config.value);
      let count = 0;
      try {
        const parsed = JSON.parse(str);
        count = Array.isArray(parsed) ? parsed.length : 0;
      } catch {
        /* ignore */
      }
      return (
        <span className="font-mono text-xs text-muted-foreground">
          {`[...]`} <span className="text-[10px]">({count} items)</span>
        </span>
      );
    }
    case "number":
      return <span className="font-mono text-xs">{String(config.value)}</span>;
    default: {
      const str = String(config.value ?? "");
      return (
        <span className="font-mono text-xs text-muted-foreground">
          {str.length > 40 ? str.slice(0, 40) + "…" : str}
        </span>
      );
    }
  }
};

const ConfigFormModal = ({
  open,
  onOpenChange,
  projectId,
  environmentId,
  editingConfig,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  environmentId: string;
  editingConfig?: ConfigEntry | null;
}) => {
  const setConfig = useSetConfig();
  const [key, setKey] = useState(editingConfig?.key ?? "");
  const [valueType, setValueType] = useState<ValueType>(
    editingConfig?.valueType ?? "string",
  );
  const [rawValue, setRawValue] = useState(() => {
    if (!editingConfig) return "";
    const v = editingConfig.value;
    if (editingConfig.valueType === "boolean") return String(v);
    if (
      editingConfig.valueType === "json" ||
      editingConfig.valueType === "array"
    ) {
      return typeof v === "string" ? v : JSON.stringify(v, null, 2);
    }
    return String(v ?? "");
  });
  const [errors, setErrors] = useState<{ key?: string; value?: string }>({});
  const [showPreview, setShowPreview] = useState(false);

  const handleTypeChange = (newType: ValueType) => {
    setValueType(newType);
    setErrors((prev) => ({ ...prev, value: undefined }));
    if (newType === "boolean") {
      if (rawValue !== "true" && rawValue !== "false") setRawValue("true");
    } else if (newType === "number") {
      if (isNaN(Number(rawValue))) setRawValue("");
    } else if (newType === "json" || newType === "array") {
      try {
        JSON.parse(rawValue);
      } catch {
        setRawValue(newType === "array" ? "[]" : "{}");
      }
    }
  };

  const handleSubmit = () => {
    const fieldErrors: { key?: string; value?: string } = {};

    const keyResult = configKeySchema.safeParse(key);
    if (!keyResult.success) {
      fieldErrors.key = keyResult.error.issues[0]?.message;
    }

    let parsedValue: unknown = rawValue;
    if (valueType === "number") {
      parsedValue = Number(rawValue);
    } else if (valueType === "boolean") {
      parsedValue = rawValue === "true";
    }

    const valueResult = configValueSchema.safeParse({
      valueType,
      value: parsedValue,
    });
    if (!valueResult.success) {
      fieldErrors.value = valueResult.error.issues[0]?.message;
    }

    if (fieldErrors.key || fieldErrors.value) {
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setConfig.mutate(
      {
        projectId,
        environmentId,
        key: keyResult.data!,
        value: parsedValue,
        valueType,
      },
      {
        onSuccess: () => {
          toast.success(editingConfig ? t`Config updated` : t`Config created`);
          onOpenChange(false);
        },
        onError: () => {
          toast.error(t`Failed to save config`);
        },
      },
    );
  };

  const getPreviewOutput = () => {
    try {
      if (valueType === "json" || valueType === "array") {
        return JSON.stringify(JSON.parse(rawValue), null, 2);
      }
      if (valueType === "number") return String(Number(rawValue));
      if (valueType === "boolean") return rawValue;
      return rawValue;
    } catch {
      return t`Invalid value`;
    }
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={
        editingConfig ? <Trans>Edit Config</Trans> : <Trans>Add Config</Trans>
      }
      description={
        editingConfig ? (
          <Trans>Update the configuration value.</Trans>
        ) : (
          <Trans>Add a new configuration entry.</Trans>
        )
      }
    >
      <div className="space-y-5">
        {/* Key field */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            <Trans>Key</Trans>
          </label>
          <Input
            placeholder={t`Config key (e.g. feature.enabled)`}
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              setErrors((prev) => ({ ...prev, key: undefined }));
            }}
            disabled={!!editingConfig}
            className="font-mono"
            autoFocus
          />
          <p className="text-[11px] text-muted-foreground">
            <Trans>Alphanumeric, dots, and underscores only.</Trans>
          </p>
          {errors.key && (
            <p className="text-xs text-destructive">{errors.key}</p>
          )}
        </div>

        {/* Type field */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            <Trans>Type</Trans>
          </label>
          <Select
            value={valueType}
            onValueChange={(v) => handleTypeChange(v as ValueType)}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VALUE_TYPES.map((vt) => (
                <SelectItem key={vt} value={vt}>
                  {vt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Value field */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            <Trans>Value</Trans>
          </label>
          {valueType === "boolean" ? (
            <Select
              value={rawValue}
              onValueChange={(v) => {
                setRawValue(v);
                setErrors((prev) => ({ ...prev, value: undefined }));
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">true</SelectItem>
                <SelectItem value="false">false</SelectItem>
              </SelectContent>
            </Select>
          ) : valueType === "json" || valueType === "array" ? (
            <Textarea
              placeholder={
                valueType === "json"
                  ? t`Enter valid JSON`
                  : t`Enter a JSON array`
              }
              value={rawValue}
              onChange={(e) => {
                setRawValue(e.target.value);
                setErrors((prev) => ({ ...prev, value: undefined }));
              }}
              className="min-h-24 font-mono text-xs"
            />
          ) : valueType === "number" ? (
            <Input
              type="number"
              placeholder={t`Numeric value`}
              value={rawValue}
              onChange={(e) => {
                setRawValue(e.target.value);
                setErrors((prev) => ({ ...prev, value: undefined }));
              }}
            />
          ) : (
            <Input
              placeholder={t`String value`}
              value={rawValue}
              onChange={(e) => {
                setRawValue(e.target.value);
                setErrors((prev) => ({ ...prev, value: undefined }));
              }}
            />
          )}
          {errors.value && (
            <p className="text-xs text-destructive">{errors.value}</p>
          )}
        </div>

        {/* Preview toggle */}
        <div>
          <button
            type="button"
            className="text-xs font-medium text-primary hover:underline"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? (
              <Trans>Hide Preview</Trans>
            ) : (
              <Trans>Show Preview</Trans>
            )}
          </button>
          {showPreview && (
            <pre className="mt-2 max-h-40 overflow-auto rounded-xl border bg-muted p-3 font-mono text-xs">
              {getPreviewOutput()}
            </pre>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            className="min-w-20 rounded-full"
            onClick={handleSubmit}
            disabled={setConfig.isPending}
          >
            {setConfig.isPending ? (
              <Spinner />
            ) : editingConfig ? (
              <Trans>Update</Trans>
            ) : (
              <Trans>Create</Trans>
            )}
          </Button>
          <Button
            variant="ghost"
            className="rounded-full"
            onClick={() => onOpenChange(false)}
          >
            <Trans>Cancel</Trans>
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
};

const ConfigsPage = () => {
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
  const { data: environments = [], isLoading: envsLoading } =
    useEnvironments(selectedProjectId);
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ConfigEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<ValueType | "all">("all");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const envId = selectedEnvId ?? environments[0]?.id ?? null;

  const { data: configs = [], isLoading: configsLoading } = useConfigs(
    selectedProjectId,
    envId,
  );

  const deleteConfig = useDeleteConfig();

  const filteredConfigs = configs.filter((c) => {
    const matchesSearch =
      !searchQuery || c.key.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || c.valueType === filterType;
    return matchesSearch && matchesType;
  });

  const handleDelete = (key: string) => {
    if (!selectedProjectId || !envId) return;
    deleteConfig.mutate(
      { projectId: selectedProjectId, environmentId: envId, key },
      {
        onSuccess: () => toast.success(t`Config deleted`),
        onError: () => toast.error(t`Failed to delete config`),
      },
    );
  };

  const getFullValue = (config: ConfigEntry) => {
    if (config.valueType === "json" || config.valueType === "array") {
      try {
        const str =
          typeof config.value === "string"
            ? config.value
            : JSON.stringify(config.value);
        return JSON.stringify(JSON.parse(str), null, 2);
      } catch {
        return String(config.value);
      }
    }
    return String(config.value ?? "");
  };

  if (!selectedProjectId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <div className="rounded-full bg-muted p-4">
          <Layers className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          <Trans>Select a project to manage configs.</Trans>
        </p>
      </div>
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
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <Trans>Configs</Trans>
          </h1>
          <p className="text-sm text-muted-foreground">
            <Trans>Manage feature flags and configuration values.</Trans>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/compare">
            <Button variant="outline" className="gap-2 rounded-full" size="sm">
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
        </div>
      </div>

      {/* Toolbar: environment selector + search + type filter */}
      {environments.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select
            value={envId ?? ""}
            onValueChange={(v) => setSelectedEnvId(v)}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t`Select environment`} />
            </SelectTrigger>
            <SelectContent>
              {environments.map((env) => (
                <SelectItem key={env.id} value={env.id}>
                  {env.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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
                <div className="flex flex-col items-center justify-center gap-4 py-12">
                  <div className="rounded-full bg-muted p-4">
                    <Layers className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">
                      <Trans>No configs yet</Trans>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <Trans>
                        Add config values to manage feature flags and settings.
                      </Trans>
                    </p>
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
                    <TableHead className="w-20">
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
                                  onClick={() => {
                                    setEditingConfig(config);
                                    setShowForm(true);
                                  }}
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
                                  disabled={deleteConfig.isPending}
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
