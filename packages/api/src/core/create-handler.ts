import {
  ApiError,
  ForbiddenError,
  MethodNotAllowedError,
  TooManyRequestsError,
} from "../errors/index";
import type {
  Req,
  Res,
  HttpMethod,
  Middleware,
  Guard,
  Interceptor,
  Pipe,
  ExceptionFilter,
  RequestContext,
  HandlerResponse,
} from "../interfaces/index";
import type { RequestHandler } from "./request-handler";

export interface CreateHandlerOptions {
  /**
   * Factory to build the initial RequestContext.
   * `res` is automatically available on ctx.
   */
  createContext?: (req: Req, res: Res) => RequestContext;
}

export function createHandler(
  HandlerClass: new () => RequestHandler,
  options?: CreateHandlerOptions,
): (req: Req, res: Res) => Promise<void> {
  const target = HandlerClass as unknown as {
    __methods?: HttpMethod[];
    __status?: number;
    __middleware?: Middleware[];
    __guards?: Guard[];
    __interceptors?: Interceptor[];
    __pipes?: Pipe[];
    __filters?: ExceptionFilter[];
  };

  const allowedMethods = target.__methods;
  const successStatus = target.__status ?? 200;
  const middleware = target.__middleware;
  const guards = target.__guards;
  const interceptors = target.__interceptors;
  const pipes = target.__pipes;
  const exceptionFilters = target.__filters;

  const handler = new HandlerClass();
  const contextFactory = options?.createContext ?? ((req: Req, res: Res) => ({ req, res }));

  return async (req: Req, res: Res): Promise<void> => {
    let ctx: RequestContext | undefined;
    let statusSet = false;

    // Track if any layer sets status explicitly
    const _originalStatus = res.status;
    res.status = (code: number) => {
      statusSet = true;
      return _originalStatus.call(res, code);
    };

    try {
      // 1. Method validation
      if (allowedMethods && allowedMethods.length > 0) {
        const method = req.method.toUpperCase() as HttpMethod;
        if (!allowedMethods.includes(method)) {
          throw new MethodNotAllowedError(
            `Method ${req.method} not allowed. Use ${allowedMethods.join(", ")}`,
          );
        }
      }

      // 2. Create context
      ctx = contextFactory(req, res);

      // 3. Middleware
      if (middleware) {
        for (const mw of middleware) {
          await mw.use(ctx);
        }
      }

      // 4. Guards
      if (guards) {
        for (const guard of guards) {
          const result = await guard.canActivate(ctx);
          if (result === false) {
            throw new ForbiddenError("Guard rejected the request");
          }
        }
      }

      // 5. Interceptors + Pipes + Handler
      const handlerWithPipes = async (): Promise<HandlerResponse> => {
        if (pipes) {
          for (const pipe of pipes) {
            await pipe.transform(ctx!);
          }
        }
        return handler.handle(ctx!);
      };

      let execute: () => Promise<HandlerResponse> = handlerWithPipes;

      if (interceptors && interceptors.length > 0) {
        for (let i = interceptors.length - 1; i >= 0; i--) {
          const interceptor = interceptors[i]!;
          const next = execute;
          execute = () => interceptor.intercept(ctx!, next);
        }
      }

      const body = await execute();

      // 6. Send response
      if (body === undefined || body === null) {
        if (!statusSet) res.status(204);
        res.end();
      } else {
        if (!statusSet) res.status(successStatus);
        res.json(body);
      }
    } catch (error) {
      // Exception filters
      if (exceptionFilters) {
        for (const filter of exceptionFilters) {
          const result = filter.catch(error, ctx ?? { req, res });
          if (result !== undefined && result !== null) {
            // Filter should have set status via ctx.res.status()
            // If not, don't set any (let json() send without explicit status)
            res.json(result);
            return;
          }
        }
      }

      // Default exception handler
      defaultExceptionHandler(error, res);
    }
  };
}

// ── Private helpers ──────────────────────────────────────────

function defaultExceptionHandler(error: unknown, res: Res): void {
  if (error instanceof ApiError) {
    if (error instanceof TooManyRequestsError && error.retryAfter != null) {
      res.set("Retry-After", String(error.retryAfter));
    }
    res.status(error.statusCode).json({
      error: { code: error.code, message: error.message },
    });
  } else {
    console.error("Unhandled error:", error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    });
  }
}
