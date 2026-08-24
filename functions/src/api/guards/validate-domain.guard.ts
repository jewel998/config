import type { Guard, RequestContext } from "@jewel998/api";

import { validateDomain } from "../middleware/validate-domain";

export class ValidateDomainGuard implements Guard {
  async canActivate(ctx: RequestContext): Promise<void> {
    if (ctx.isServerKey) return;
    await validateDomain(ctx.db, ctx.projectId!, ctx.environmentId!, ctx.origin!);
  }
}
