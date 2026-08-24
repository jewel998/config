import type { Interceptor } from "../interfaces/index";

/**
 * @UseInterceptors(TimingInterceptor, CacheInterceptor)
 *
 * Wraps the handler (onion model). Access to request + response.
 */
export function UseInterceptors(
  ...interceptors: Interceptor[]
): ClassDecorator {
  return (target) => {
    (target as unknown as { __interceptors: Interceptor[] }).__interceptors =
      interceptors;
  };
}
