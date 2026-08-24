import type { HttpMethod } from "../interfaces/index";

/**
 * @Methods("GET", "POST")
 *
 * Declares accepted HTTP methods. 405 on mismatch.
 */
export function Methods(...methods: HttpMethod[]): ClassDecorator {
  return (target) => {
    (target as unknown as { __methods: HttpMethod[] }).__methods = methods;
  };
}
