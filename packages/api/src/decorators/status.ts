/**
 * @Status(201)
 *
 * Declares the HTTP status code for a successful response.
 * Default: 200 if not applied.
 */
export function Status(code: number): ClassDecorator {
  return (target) => {
    (target as unknown as { __status: number }).__status = code;
  };
}
