/**
 * The handler just returns the response body.
 * Status is declared via @Status(code) decorator (default: 200).
 * Headers are set directly via ctx.res.set().
 */
export type HandlerResponse = unknown;
