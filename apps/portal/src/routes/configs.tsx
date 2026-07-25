import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
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

const ConfigForm = ({
  projectId,
  environmentId,
  editingConfig,
  onClose,
}: {
  projectId: string;
  environmentId: string;
  editingConfig?: ConfigEntry | null;
  onClose: () => void;
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

  const handleTypeChange = (newType: ValueType) => {
    setValueType(newType);
    setErrors((prev) => ({ ...prev, value: undefined }));
    // Reset value if type changes and can't be converted
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

    // Validate key
    const keyResult = configKeySchema.safeParse(key);
    if (!keyResult.success) {
      fieldErrors.key = keyResult.error.issues[0]?.message;
    }

    // Parse value based on type
    let parsedValue: unknown = rawValue;
    if (valueType === "number") {
      parsedValue = Number(rawValue);
    } else if (valueType === "boolean") {
      parsedValue = rawValue === "true";
    }

    // Validate value
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
          onClose();
        },
        onError: () => {
          toast.error(t`Failed to save config`);
        },
      },
    );
  };

  return (
    <Card className="rounded-xl">
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-1">
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
          {errors.key && (
            <p className="text-xs text-destructive">{errors.key}</p>
          )}
        </div>

        <div className="space-y-1">
          <Select
            value={valueType}
            onValueChange={(v) => handleTypeChange(v as ValueType)}
          >
            <SelectTrigger className="w-40">
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

        <div className="space-y-1">
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
          <Button variant="ghost" className="rounded-full" onClick={onClose}>
            <Trans>Cancel</Trans>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const ConfigRow = ({
  config,
  projectId,
  environmentId,
  onEdit,
}: {
  config: ConfigEntry;
  projectId: string;
  environmentId: string;
  onEdit: () => void;
}) => {
  const deleteConfig = useDeleteConfig();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const displayValue = () => {
    if (config.valueType === "boolean") return String(config.value);
    if (config.valueType === "json" || config.valueType === "array") {
      const str =
        typeof config.value === "string"
          ? config.value
          : JSON.stringify(config.value);
      return str.length > 60 ? str.slice(0, 60) + "…" : str;
    }
    const str = String(config.value ?? "");
    return str.length > 60 ? str.slice(0, 60) + "…" : str;
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    deleteConfig.mutate(
      { projectId, environmentId, key: config.key },
      {
        onSuccess: () => toast.success(t`Config deleted`),
        onError: () => toast.error(t`Failed to delete config`),
      },
    );
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-mono text-sm font-medium">
            {config.key}
          </span>
          <Badge variant="secondary" className="rounded-full text-xs">
            {config.valueType}
          </Badge>
        </div>
        <p className="truncate font-mono text-xs text-muted-foreground">
          {displayValue()}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon-xs"
          className="rounded-full"
          onClick={onEdit}
          aria-label="Edit"
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          className="rounded-full text-destructive hover:text-destructive"
          onClick={handleDelete}
          disabled={deleteConfig.isPending}
          aria-label="Delete"
        >
          {deleteConfig.isPending ? (
            <Spinner />
          ) : (
            <Trash2 className="h-3 w-3" />
          )}
        </Button>
        {confirmDelete && (
          <span className="text-xs text-destructive">
            <Trans>Click again to confirm</Trans>
          </span>
        )}
      </div>
    </div>
  );
};

const ConfigsPage = () => {
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
  const { data: environments = [], isLoading: envsLoading } =
    useEnvironments(selectedProjectId);
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ConfigEntry | null>(null);

  // Auto-select first environment
  const envId = selectedEnvId ?? environments[0]?.id ?? null;

  const { data: configs = [], isLoading: configsLoading } = useConfigs(
    selectedProjectId,
    envId,
  );

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <Trans>Configs</Trans>
          </h1>
          <p className="text-sm text-muted-foreground">
            <Trans>Manage feature flags and configuration values.</Trans>
          </p>
        </div>
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

      {/* Environment selector */}
      {environments.length > 0 && (
        <Select value={envId ?? ""} onValueChange={(v) => setSelectedEnvId(v)}>
          <SelectTrigger className="w-56">
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

      {/* Form */}
      {showForm && envId && selectedProjectId && (
        <ConfigForm
          projectId={selectedProjectId}
          environmentId={envId}
          editingConfig={editingConfig}
          onClose={() => {
            setShowForm(false);
            setEditingConfig(null);
          }}
        />
      )}

      {/* Configs list */}
      {envId && (
        <>
          {configsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
          ) : configs.length === 0 && !showForm ? (
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
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="text-base">
                  <Trans>Config Values</Trans>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {configs.map((config) => (
                  <ConfigRow
                    key={config.key}
                    config={config}
                    projectId={selectedProjectId!}
                    environmentId={envId}
                    onEdit={() => {
                      setEditingConfig(config);
                      setShowForm(true);
                    }}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export const Route = createFileRoute("/configs")({
  component: ConfigsPage,
});
