import type { LoadingResult } from "../types";

export const executeDeferred = (): LoadingResult => {
  // No network activity at init time
  return { initialData: {}, status: "ready" };
};
