import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useState } from "react";
import { toast } from "sonner";

import { ResponsiveModal } from "@/components/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  type ConfigEntry,
  configKeySchema,
  configValueSchema,
  useSetConfig,
} from "@/hooks/use-configs";

type ValueType = ConfigEntry["valueType"];

const VALUE_TYPES: ValueType[] = [
  "string",
  "number",
  "boolean",
  "json",
  "array",
];

interface ConfigFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  environmentId: string;
  editingConfig?: ConfigEntry | null;
  isProductionEnv?: boolean;
}

export const ConfigFormModal = ({
  open,
  onOpenChange,
  projectId,
  environmentId,
  editingConfig,
  isProductionEnv,
}: ConfigFormModalProps) => {
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
    if (isProductionEnv) {
      const confirmed = window.confirm(
        t`This is a production environment. Changes will affect live users. Continue?`,
      );
      if (!confirmed) return;
    }

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
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? (
              <Trans>Hide Preview</Trans>
            ) : (
              <Trans>Show Preview</Trans>
            )}
          </Button>
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
