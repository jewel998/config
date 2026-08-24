import { create } from "zustand";

import type { ConflictStrategy, ImportEntry, ValidationResult } from "@/lib/types";

export type WizardStep = "upload" | "preview" | "validate" | "confirm" | "results";

/** Result shape stored in the wizard store after import completes */
export interface ImportResult {
  succeeded: number;
  failed: number;
  skipped: number;
  failedEntries: Array<{ key: string; reason: string }>;
}

interface ImportWizardState {
  // State
  step: WizardStep;
  file: File | null;
  parsedEntries: ImportEntry[];
  validationResult: ValidationResult | null;
  conflictStrategy: ConflictStrategy | null;
  reviewDecisions: Record<string, "accept" | "reject">;
  jobId: string | null;
  importResult: ImportResult | null;

  // Actions
  setStep: (step: WizardStep) => void;
  setFile: (file: File) => void;
  setParsedEntries: (entries: ImportEntry[]) => void;
  setValidationResult: (result: ValidationResult) => void;
  setConflictStrategy: (strategy: ConflictStrategy) => void;
  setReviewDecision: (key: string, decision: "accept" | "reject") => void;
  setJobId: (id: string) => void;
  setImportResult: (result: ImportResult) => void;
  reset: () => void;
}

const initialState = {
  step: "upload" as WizardStep,
  file: null as File | null,
  parsedEntries: [] as ImportEntry[],
  validationResult: null as ValidationResult | null,
  conflictStrategy: null as ConflictStrategy | null,
  reviewDecisions: {} as Record<string, "accept" | "reject">,
  jobId: null as string | null,
  importResult: null as ImportResult | null,
};

export const useImportWizardStore = create<ImportWizardState>((set) => ({
  ...initialState,

  setStep: (step) => set({ step }),

  setFile: (file) => set({ file }),

  setParsedEntries: (parsedEntries) => set({ parsedEntries }),

  setValidationResult: (validationResult) => set({ validationResult }),

  setConflictStrategy: (conflictStrategy) => set({ conflictStrategy }),

  setReviewDecision: (key, decision) =>
    set((state) => ({
      reviewDecisions: { ...state.reviewDecisions, [key]: decision },
    })),

  setJobId: (jobId) => set({ jobId }),

  setImportResult: (importResult) => set({ importResult }),

  reset: () => set(initialState),
}));
