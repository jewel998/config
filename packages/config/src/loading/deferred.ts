import type { LoadingResult } from "../types.js";

export const executeDeferred = (): LoadingResult => {
  // No network activity at init time
  return { initialData: {}, status: "ready" };
};
