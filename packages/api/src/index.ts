// ═══════════════════════════════════════════════════════════════
// @jewel998/api
// ═══════════════════════════════════════════════════════════════

// Core
export { RequestHandler, createHandler } from "./core/index";
export type { CreateHandlerOptions } from "./core/index";

// Decorators
export {
  Methods,
  Status,
  UseMiddleware,
  UseGuards,
  UseInterceptors,
  UsePipes,
  UseFilters,
} from "./decorators/index";

// Interfaces
export type {
  HttpMethod,
  Req,
  Res,
  RequestContext,
  HandlerResponse,
  Middleware,
  Guard,
  Interceptor,
  Pipe,
  ExceptionFilter,
} from "./interfaces/index";

// Errors
export {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  MethodNotAllowedError,
  PayloadTooLargeError,
  TooManyRequestsError,
  InternalError,
} from "./errors/index";
