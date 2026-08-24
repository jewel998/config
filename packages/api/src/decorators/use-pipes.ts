import type { Pipe } from "../interfaces/index";

/**
 * @UsePipes(ValidateBody, SanitizeInput)
 *
 * Runs AFTER interceptors (pre), BEFORE handler.
 * For validation and request data transformation.
 */
export function UsePipes(...pipes: Pipe[]): ClassDecorator {
  return (target) => {
    (target as unknown as { __pipes: Pipe[] }).__pipes = pipes;
  };
}
