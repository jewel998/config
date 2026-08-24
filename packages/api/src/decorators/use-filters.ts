import type { ExceptionFilter } from "../interfaces/index";

/**
 * @UseFilters(GlobalExceptionFilter)
 *
 * Catches errors from ANY layer in the pipeline.
 * Return a HandlerResponse to handle, or undefined to pass.
 */
export function UseFilters(...filters: ExceptionFilter[]): ClassDecorator {
  return (target) => {
    (target as unknown as { __filters: ExceptionFilter[] }).__filters = filters;
  };
}
