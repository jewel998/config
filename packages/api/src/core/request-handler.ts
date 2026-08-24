import type { RequestContext, HandlerResponse } from "../interfaces/index";

/**
 * RequestHandler — Abstract base class for all HTTP handlers.
 *
 * Return the response body. Status is set via @Status(code).
 * Headers are set via ctx.res.set() anywhere in the pipeline.
 *
 * @example
 * ```ts
 * @Methods("POST")
 * @Status(201)
 * class CreateHandler extends RequestHandler {
 *   handle(ctx) {
 *     ctx.res.set("Location", "/items/123");
 *     return { id: "123", created: true };
 *   }
 * }
 * ```
 */
export abstract class RequestHandler {
  abstract handle(
    ctx: RequestContext,
  ): Promise<HandlerResponse> | HandlerResponse;
}
