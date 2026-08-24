import type { Guard, RequestContext } from "@jewel998/api";
import { fetchConfigs } from "../middleware/fetch-configs";

export class FetchConfigsGuard implements Guard {
  async canActivate(ctx: RequestContext): Promise<void> {
    const { configs, segments, version, latestUpdate } = await fetchConfigs(
      ctx.db,
      ctx.projectId!,
      ctx.environmentId!,
      ctx.requestedKeys,
    );
    ctx.configs = configs;
    ctx.segments = segments;
    ctx.version = version;
    ctx.latestUpdate = latestUpdate;
  }
}
