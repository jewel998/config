import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  FileUp,
  Loader2,
  Upload,
  XCircle,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  parseCsvFile,
  parseJsonFile,
  serializeToCsv,
} from "@/lib/import-parser";
import {
  getPreviewRows,
  validateEntryCount,
  validateUpload,
} from "@/lib/import-upload-validation";
import type {
  ConflictStrategy,
  ImportEntry,
  RawEntry,
  ValidationResult,
} from "@/lib/types";
import { useImportConfigs } from "@/hooks/use-import";
import { useEnvironments } from "@/hooks/use-environments";
import { useProjects } from "@/hooks/use-projects";
import {
  useImportWizardStore,
  type WizardStep,
} from "@/stores/import-wizard-store";
import { useProjectStore } from "@/stores/project-store";

// ─── Wizard Steps ────────────────────────────────────────────

const STEPS: WizardStep[] = [
  "upload",
  "preview",
  "validate",
  "confirm",
  "results",
];

function ImportPage() {
  const store = useImportWizardStore();
  const projectId = useProjectStore((s) => s.selectedProjectId);
  const environmentId = useProjectStore((s) => s.selectedEnvironmentId);
  const importMutation = useImportConfigs();
  const { data: projects = [] } = useProjects();
  const { data: environments = [] } = useEnvironments(projectId);

  const projectName =
    projects.find((p) => p.id === projectId)?.name ?? projectId;
  const environmentName =
    environments.find((e) => e.id === environmentId)?.name ?? environmentId;

  const stepIndex = STEPS.indexOf(store.step);

  const canGoBack = stepIndex > 0 && store.step !== "results";
  const canGoNext = stepIndex < STEPS.length - 1 && store.step !== "results";

  const goBack = () => {
    if (canGoBack) store.setStep(STEPS[stepIndex - 1]);
  };

  const goNext = () => {
    if (canGoNext) store.setStep(STEPS[stepIndex + 1]);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">
          <Trans>Import Configurations</Trans>
        </h1>
        <p className="text-muted-foreground mt-1">
          <Trans>
            Bulk import configuration entries from a CSV or JSON file.
          </Trans>
        </p>
      </div>

      {/* Step Indicator */}
      <StepIndicator currentStep={store.step} />

      {/* Project/Environment Context */}
      {projectId && environmentId && (
        <div className="bg-muted/50 rounded-md px-4 py-2 text-sm">
          <Trans>Target:</Trans>{" "}
          <span className="font-medium">{projectName}</span> /{" "}
          <span className="font-medium">{environmentName}</span>
        </div>
      )}

      {/* Step Content */}
      {store.step === "upload" && <UploadStep onNext={goNext} />}
      {store.step === "preview" && <PreviewStep />}
      {store.step === "validate" && <ValidateStep />}
      {store.step === "confirm" && <ConfirmStep />}
      {store.step === "results" && <ResultsStep />}

      {/* Navigation */}
      {store.step !== "upload" && store.step !== "results" && (
        <div className="flex justify-between">
          <Button variant="outline" onClick={goBack} disabled={!canGoBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            <Trans>Back</Trans>
          </Button>
          {store.step !== "confirm" && (
            <Button onClick={goNext} disabled={!canGoNext}>
              <Trans>Next</Trans>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Step Indicator ──────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: WizardStep }) {
  const labels: Record<WizardStep, string> = {
    upload: t`Upload`,
    preview: t`Preview`,
    validate: t`Validate`,
    confirm: t`Confirm`,
    results: t`Results`,
  };

  return (
    <div
      className="flex items-center gap-2"
      role="navigation"
      aria-label={t`Import wizard steps`}
    >
      {STEPS.map((step, i) => {
        const isActive = step === currentStep;
        const isPast = STEPS.indexOf(currentStep) > i;
        return (
          <div key={step} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : isPast
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}
              aria-current={isActive ? "step" : undefined}
            >
              {i + 1}
            </div>
            <span
              className={`text-sm ${isActive ? "font-medium" : "text-muted-foreground"}`}
            >
              {labels[step]}
            </span>
            {i < STEPS.length - 1 && <div className="bg-border h-px w-8" />}
          </div>
        );
      })}
    </div>
  );
}

// ─── Upload Step ─────────────────────────────────────────────

function UploadStep({ onNext }: { onNext: () => void }) {
  const store = useImportWizardStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      // Validate upload
      const uploadError = validateUpload(file.name, file.size);
      if (uploadError) {
        toast.error(uploadError.message);
        return;
      }

      // Parse file
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const isJson = file.name.toLowerCase().endsWith(".json");
        const result = isJson ? parseJsonFile(text) : parseCsvFile(text);

        if (result.errors.length > 0 && result.entries.length === 0) {
          toast.error(
            result.errors[0]?.message ||
              t`File is empty or contains no valid rows`,
          );
          return;
        }

        // Validate entry count
        const countError = validateEntryCount(result.entries as RawEntry[]);
        if (countError) {
          toast.error(countError.message);
          return;
        }

        store.setFile(file);
        store.setParsedEntries(result.entries as ImportEntry[]);
        onNext();
      };
      reader.readAsText(file);
    },
    [store, onNext],
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const downloadTemplate = (format: "csv" | "json") => {
    const csvTemplate = `key,value,valueType
feature.dark_mode,true,boolean
api.timeout,5000,number
app.title,"My App",string
theme.colors,"{""primary"":""#333""}",json
allowed.domains,"[""a.com"",""b.com""]",array`;

    const jsonTemplate = JSON.stringify(
      [
        { key: "feature.dark_mode", value: true, valueType: "boolean" },
        { key: "api.timeout", value: 5000, valueType: "number" },
        { key: "app.title", value: "My App", valueType: "string" },
        {
          key: "theme.colors",
          value: '{"primary":"#333"}',
          valueType: "json",
        },
        {
          key: "allowed.domains",
          value: '["a.com","b.com"]',
          valueType: "array",
        },
      ],
      null,
      2,
    );

    const content = format === "csv" ? csvTemplate : jsonTemplate;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `import-template.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Trans>Upload File</Trans>
        </CardTitle>
        <CardDescription>
          <Trans>
            Upload a CSV or JSON file with your configuration entries. Maximum 5
            MB, up to 10,000 entries.
          </Trans>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop Zone */}
        <div
          className={`flex min-h-[200px] flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setIsDragging(false)}
          role="button"
          tabIndex={0}
          aria-label={t`Drop file here or click to upload`}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              fileInputRef.current?.click();
            }
          }}
        >
          <Upload className="text-muted-foreground mb-4 h-10 w-10" />
          <p className="text-muted-foreground text-sm">
            <Trans>Drag and drop your file here, or click to browse</Trans>
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            <Trans>Accepts .csv and .json files (max 5 MB)</Trans>
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          aria-hidden="true"
        />

        {/* Template Downloads */}
        <div className="flex gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadTemplate("csv")}
              >
                <Download className="mr-2 h-4 w-4" />
                <Trans>CSV Template</Trans>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <Trans>Download a sample CSV file with the expected format</Trans>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadTemplate("json")}
              >
                <Download className="mr-2 h-4 w-4" />
                <Trans>JSON Template</Trans>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <Trans>
                Download a sample JSON file with the expected format
              </Trans>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Preview Step ────────────────────────────────────────────

function PreviewStep() {
  const { parsedEntries, file } = useImportWizardStore();
  const previewRows = getPreviewRows(parsedEntries);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Trans>Preview</Trans>
        </CardTitle>
        <CardDescription>
          <Trans>
            Showing {previewRows.length} of {parsedEntries.length} entries from{" "}
            {file?.name ?? "file"}
          </Trans>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>
                <Trans>Key</Trans>
              </TableHead>
              <TableHead>
                <Trans>Value</Trans>
              </TableHead>
              <TableHead>
                <Trans>Type</Trans>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewRows.map((entry, i) => (
              <TableRow key={i}>
                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="font-mono text-sm">
                  {String(entry.key)}
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-sm">
                  {JSON.stringify(entry.value)}
                </TableCell>
                <TableCell>
                  <span className="bg-muted rounded px-2 py-0.5 text-xs">
                    {String(entry.valueType)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Validate Step ───────────────────────────────────────────

function ValidateStep() {
  const { parsedEntries, validationResult, setValidationResult } =
    useImportWizardStore();

  // Run client-side validation (mirroring server validator)
  useMemo(() => {
    if (validationResult) return;
    const valid: ImportEntry[] = [];
    const failed: ValidationResult["failed"] = [];
    const seenKeys = new Set<string>();

    for (let i = 0; i < parsedEntries.length; i++) {
      const entry = parsedEntries[i];
      const rowNumber = i + 1;

      if (!entry.key) {
        failed.push({
          rowNumber,
          entry,
          reason: "missing required field: key",
        });
        continue;
      }
      if (!entry.valueType) {
        failed.push({
          rowNumber,
          entry,
          reason: "missing required field: valueType",
        });
        continue;
      }
      if (seenKeys.has(entry.key)) {
        failed.push({ rowNumber, entry, reason: "duplicate key in file" });
        continue;
      }
      seenKeys.add(entry.key);
      valid.push(entry);
    }

    setValidationResult({ valid, failed, conflicts: [] });
  }, [parsedEntries, validationResult, setValidationResult]);

  const total = parsedEntries.length;
  const validCount = validationResult?.valid.length ?? 0;
  const failedCount = validationResult?.failed.length ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Trans>Validation Results</Trans>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border p-4 text-center">
            <p className="text-2xl font-semibold">{total}</p>
            <p className="text-muted-foreground text-sm">
              <Trans>Total</Trans>
            </p>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center dark:border-green-900 dark:bg-green-950">
            <p className="text-2xl font-semibold text-green-700 dark:text-green-400">
              {validCount}
            </p>
            <p className="text-sm text-green-600 dark:text-green-500">
              <Trans>Valid</Trans> (
              {total > 0 ? Math.round((validCount / total) * 100) : 0}%)
            </p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center dark:border-red-900 dark:bg-red-950">
            <p className="text-2xl font-semibold text-red-700 dark:text-red-400">
              {failedCount}
            </p>
            <p className="text-sm text-red-600 dark:text-red-500">
              <Trans>Failed</Trans> (
              {total > 0 ? Math.round((failedCount / total) * 100) : 0}%)
            </p>
          </div>
        </div>

        {failedCount > 0 && (
          <div className="max-h-[300px] overflow-auto rounded border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Trans>Row</Trans>
                  </TableHead>
                  <TableHead>
                    <Trans>Key</Trans>
                  </TableHead>
                  <TableHead>
                    <Trans>Reason</Trans>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {validationResult?.failed.map((row) => (
                  <TableRow key={row.rowNumber}>
                    <TableCell>{row.rowNumber}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {String(row.entry.key ?? "—")}
                    </TableCell>
                    <TableCell className="text-destructive text-sm">
                      {row.reason}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Confirm Step ────────────────────────────────────────────

function ConfirmStep() {
  const store = useImportWizardStore();
  const projectId = useProjectStore((s) => s.selectedProjectId);
  const environmentId = useProjectStore((s) => s.selectedEnvironmentId);
  const importMutation = useImportConfigs();

  const hasConflicts = (store.validationResult?.conflicts.length ?? 0) > 0;

  const handleConfirm = async () => {
    if (!projectId || !environmentId) {
      toast.error(t`No project or environment selected`);
      return;
    }
    if (hasConflicts && !store.conflictStrategy) {
      toast.error(t`Please select a conflict resolution strategy`);
      return;
    }

    try {
      await importMutation.mutateAsync({
        projectId,
        environmentId,
        entries: store.validationResult?.valid ?? [],
        conflictStrategy: store.conflictStrategy ?? "skip",
        reviewDecisions:
          store.conflictStrategy === "review"
            ? store.reviewDecisions
            : undefined,
      });
      // setImportResult is called inside useImportConfigs before this resolves
      // so by the time we get here, the store already has the result
      store.setStep("results");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t`Import failed`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Trans>Confirm Import</Trans>
        </CardTitle>
        <CardDescription>
          <Trans>
            Review your import settings and confirm to begin processing.
          </Trans>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border p-4">
          <p className="text-sm">
            <Trans>Entries to import:</Trans>{" "}
            <span className="font-medium">
              {store.validationResult?.valid.length ?? 0}
            </span>
          </p>
        </div>

        {hasConflicts && (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              <Trans>
                {store.validationResult?.conflicts.length} conflicting entries
                found. Choose a resolution strategy:
              </Trans>
            </p>
            <Select
              value={store.conflictStrategy ?? ""}
              onValueChange={(v) =>
                store.setConflictStrategy(v as ConflictStrategy)
              }
            >
              <SelectTrigger aria-label={t`Conflict resolution strategy`}>
                <SelectValue placeholder={t`Select strategy`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="skip">
                  <Trans>Skip existing — keep current values</Trans>
                </SelectItem>
                <SelectItem value="overwrite">
                  <Trans>
                    Overwrite existing — replace with imported values
                  </Trans>
                </SelectItem>
                <SelectItem value="review">
                  <Trans>Review individually — decide per entry</Trans>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <Button
          onClick={handleConfirm}
          disabled={
            importMutation.isPending ||
            (hasConflicts && !store.conflictStrategy)
          }
          className="w-full"
        >
          {importMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <Trans>Processing...</Trans>
            </>
          ) : (
            <>
              <FileUp className="mr-2 h-4 w-4" />
              <Trans>Start Import</Trans>
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Results Step ────────────────────────────────────────────

function ResultsStep() {
  const store = useImportWizardStore();
  const importMutation = useImportConfigs();
  const result = store.importResult;

  // Show loading if mutation is still running
  if (importMutation.isPending) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-3 text-muted-foreground">
            <Trans>Importing configurations...</Trans>
          </span>
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Trans>No import results available. Please start a new import.</Trans>
        </CardContent>
      </Card>
    );
  }

  const total = result.succeeded + result.failed + result.skipped;
  const hasFailures = result.failed > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {hasFailures ? (
            <XCircle className="h-5 w-5 text-yellow-500" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          )}
          <Trans>Import Complete</Trans>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border p-3 text-center">
            <p className="text-lg font-semibold">{total}</p>
            <p className="text-muted-foreground text-xs">
              <Trans>Total</Trans>
            </p>
          </div>
          <div className="rounded-lg border border-green-200 p-3 text-center dark:border-green-900">
            <p className="text-lg font-semibold text-green-600">
              {result.succeeded}
            </p>
            <p className="text-xs text-green-600">
              <Trans>Succeeded</Trans>
            </p>
          </div>
          <div className="rounded-lg border border-red-200 p-3 text-center dark:border-red-900">
            <p className="text-lg font-semibold text-red-600">
              {result.failed}
            </p>
            <p className="text-xs text-red-600">
              <Trans>Failed</Trans>
            </p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-lg font-semibold">{result.skipped}</p>
            <p className="text-muted-foreground text-xs">
              <Trans>Skipped</Trans>
            </p>
          </div>
        </div>

        {/* Failed entries detail */}
        {hasFailures && (
          <div className="max-h-[300px] overflow-auto rounded border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Trans>Key</Trans>
                  </TableHead>
                  <TableHead>
                    <Trans>Reason</Trans>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.failedEntries.map((entry, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-sm">
                      {entry.key}
                    </TableCell>
                    <TableCell className="text-destructive text-sm">
                      {entry.reason}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => store.reset()}>
            <Trans>Start New Import</Trans>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Route Export ────────────────────────────────────────────

export const Route = createFileRoute("/import")({
  component: ImportPage,
});
