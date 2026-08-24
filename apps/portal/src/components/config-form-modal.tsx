import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ChevronDown, ChevronRight } from "lucide-react";
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
import { confirm } from "@/lib/confirm";

type ValueType = ConfigEntry["valueType"];

const VALUE_TYPES: ValueType[] = ["string", "number", "boolean", "json", "array"];

interface ConfigFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  environmentId: string;
  editingConfig?: ConfigEntry | null;
  duplicateFrom?: ConfigEntry | null;
  isProductionEnv?: boolean;
}

export const ConfigFormModal = ({
  open,
  onOpenChange,
  projectId,
  environmentId,
  editingConfig,
  duplicateFrom,
  isProductionEnv,
}: ConfigFormModalProps) => {
  const setConfig = useSetConfig();
  const sourceConfig = editingConfig ?? duplicateFrom;
  const [key, setKey] = useState(editingConfig?.key ?? "");
  const [valueType, setValueType] = useState<ValueType>(sourceConfig?.valueType ?? "string");
  const [rawValue, setRawValue] = useState(() => {
    if (!sourceConfig) return "";
    const v = sourceConfig.value;
    if (sourceConfig.valueType === "boolean") return String(v);
    if (sourceConfig.valueType === "json" || sourceConfig.valueType === "array") {
      return typeof v === "string" ? v : JSON.stringify(v, null, 2);
    }
    return String(v ?? "");
  });
  const [errors, setErrors] = useState<{ key?: string; value?: string }>({});
  const [showPreview, setShowPreview] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [validationMin, setValidationMin] = useState("");
  const [validationMax, setValidationMax] = useState("");
  const [validationRegex, setValidationRegex] = useState("");
  const [validationEnum, setValidationEnum] = useState("");

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

  const handleSubmit = async () => {
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

    // Custom validation rules
    if (!fieldErrors.value) {
      if (valueType === "number" && typeof parsedValue === "number") {
        if (validationMin && parsedValue < Number(validationMin)) {
          fieldErrors.value = t`Value must be at least ${validationMin}`;
        }
        if (validationMax && parsedValue > Number(validationMax)) {
          fieldErrors.value = t`Value must be at most ${validationMax}`;
        }
      }
      if (valueType === "string" && typeof parsedValue === "string") {
        if (validationRegex) {
          try {
            const regex = new RegExp(validationRegex);
            if (!regex.test(parsedValue)) {
              fieldErrors.value = t`Value does not match pattern: ${validationRegex}`;
            }
          } catch {
            fieldErrors.value = t`Invalid regex pattern`;
          }
        }
        if (validationEnum) {
          const allowed = validationEnum
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          if (allowed.length > 0 && !allowed.includes(parsedValue)) {
            fieldErrors.value = t`Value must be one of: ${allowed.join(", ")}`;
          }
        }
      }
    }

    if (fieldErrors.key || fieldErrors.value) {
      setErrors(fieldErrors);
      return;
    }

    // Confirm for production AFTER validation passes
    if (isProductionEnv) {
      const ok = await confirm({
        title: t`Production environment`,
        description: t`Changes will affect live users. Are you sure you want to continue?`,
        confirmLabel: t`Continue`,
        variant: "destructive",
      });
      if (!ok) return;
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
        editingConfig ? (
          <Trans>Edit Config</Trans>
        ) : duplicateFrom ? (
          <Trans>Duplicate Config</Trans>
        ) : (
          <Trans>Add Config</Trans>
        )
      }
      description={
        editingConfig ? (
          <Trans>Update the configuration value.</Trans>
        ) : duplicateFrom ? (
          <Trans>Create a copy with a new key.</Trans>
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
          {errors.key && <p className="text-xs text-destructive">{errors.key}</p>}
        </div>

        {/* Type field */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            <Trans>Type</Trans>
          </label>
          <Select value={valueType} onValueChange={(v) => handleTypeChange(v as ValueType)}>
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
              placeholder={valueType === "json" ? t`Enter valid JSON` : t`Enter a JSON array`}
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
          {errors.value && <p className="text-xs text-destructive">{errors.value}</p>}
        </div>

        {/* Validation Rules (collapsible) */}
        <div className="space-y-2">
          <button
            type="button"
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowValidation(!showValidation)}
          >
            {showValidation ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            <Trans>Validation Rules</Trans>
            <span className="text-[10px] text-muted-foreground/60">({t`optional`})</span>
          </button>
          {showValidation && (
            <div className="space-y-3 rounded-lg border p-3">
              {valueType === "number" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      <Trans>Min value</Trans>
                    </label>
                    <Input
                      type="number"
                      placeholder={t`No minimum`}
                      value={validationMin}
                      onChange={(e) => setValidationMin(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      <Trans>Max value</Trans>
                    </label>
                    <Input
                      type="number"
                      placeholder={t`No maximum`}
                      value={validationMax}
                      onChange={(e) => setValidationMax(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              )}
              {valueType === "string" && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      <Trans>Regex pattern</Trans>
                    </label>
                    <Input
                      placeholder={t`e.g. ^https?://`}
                      value={validationRegex}
                      onChange={(e) => setValidationRegex(e.target.value)}
                      className="h-8 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      <Trans>Allowed values (comma-separated)</Trans>
                    </label>
                    <Input
                      placeholder={t`e.g. small, medium, large`}
                      value={validationEnum}
                      onChange={(e) => setValidationEnum(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </>
              )}
              {(valueType === "json" || valueType === "array") && (
                <p className="text-xs text-muted-foreground">
                  <Trans>
                    JSON and array values are validated for correct syntax automatically.
                  </Trans>
                </p>
              )}
              {valueType === "boolean" && (
                <p className="text-xs text-muted-foreground">
                  <Trans>Boolean values are constrained to true/false by default.</Trans>
                </p>
              )}
            </div>
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
            {showPreview ? <Trans>Hide Preview</Trans> : <Trans>Show Preview</Trans>}
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
          <Button variant="ghost" className="rounded-full" onClick={() => onOpenChange(false)}>
            <Trans>Cancel</Trans>
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
};
