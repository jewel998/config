import type { Guard } from "../interfaces/index";

/**
 * @UseGuards(Authenticate, ValidateDomain, FetchConfigs)
 *
 * Runs AFTER middleware. Before interceptors, pipes, handler.
 * Return false or throw to reject.
 */
export function UseGuards(...guards: Guard[]): ClassDecorator {
  return (target) => {
    (target as unknown as { __guards: Guard[] }).__guards = guards;
  };
}
