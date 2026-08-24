import type { RawEntry } from "./types";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_ENTRY_COUNT = 10_000;
const ACCEPTED_EXTENSIONS = [".csv", ".json"];
const MAX_PREVIEW_ROWS = 10;

export interface UploadValidationError {
  code: "invalid_extension" | "file_too_large" | "too_many_entries" | "empty_file";
  message: string;
}

/**
 * Check if a file has an accepted extension (.csv or .json, case-insensitive).
 */
export function isValidFileExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Check if a file is within the size limit (5 MB).
 */
export function isWithinSizeLimit(fileSize: number): boolean {
  return fileSize <= MAX_FILE_SIZE_BYTES;
}

/**
 * Check if the entry count is within limits (≤ 10,000).
 */
export function isWithinEntryLimit(entryCount: number): boolean {
  return entryCount <= MAX_ENTRY_COUNT;
}

/**
 * Get preview rows (first 10 or all if fewer than 10).
 */
export function getPreviewRows<T>(rows: T[]): T[] {
  return rows.slice(0, MAX_PREVIEW_ROWS);
}

/**
 * Validate an uploaded file before parsing.
 * Checks run in order: extension → size. Entry count is checked after parsing.
 * Returns null if valid, or an error object.
 */
export function validateUpload(fileName: string, fileSize: number): UploadValidationError | null {
  if (!isValidFileExtension(fileName)) {
    return {
      code: "invalid_extension",
      message: "Only .csv and .json files are supported",
    };
  }

  if (!isWithinSizeLimit(fileSize)) {
    return {
      code: "file_too_large",
      message: "File exceeds maximum size of 5 MB",
    };
  }

  return null;
}

/**
 * Validate entry count after parsing.
 * Returns null if valid, or an error object.
 */
export function validateEntryCount(entries: RawEntry[]): UploadValidationError | null {
  if (entries.length === 0) {
    return {
      code: "empty_file",
      message: "File is empty or contains no rows matching the expected format",
    };
  }

  if (entries.length > MAX_ENTRY_COUNT) {
    return {
      code: "too_many_entries",
      message: `File contains more than ${MAX_ENTRY_COUNT.toLocaleString()} entries`,
    };
  }

  return null;
}
