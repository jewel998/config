import type { Guard, RequestContext } from "@jewel998/api";

import { authenticateClient } from "../middleware/authenticate";

export class AuthenticateGuard implements Guard {
  async canActivate(ctx: RequestContext): Promise<void> {
    const { projectId, environmentId } = await authenticateClient(ctx.db, ctx.clientId!);
    ctx.projectId = projectId;
    ctx.environmentId = environmentId;
  }
}
