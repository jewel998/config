import { useQuery } from "@tanstack/react-query";

import { useConfigs } from "@/hooks/use-configs";
import { computeSegmentUsage } from "@/lib/config-utils";
import type { ConfigFlagExtended } from "@/lib/types";

export const useSegmentUsage = (
  projectId: string | null,
  environmentId: string | null,
  segmentId: string,
) => {
  const { data: configs = [] } = useConfigs(projectId, environmentId);

  return useQuery({
    queryKey: ["segment-usage", projectId, environmentId, segmentId],
    queryFn: () => {
      return computeSegmentUsage(configs as ConfigFlagExtended[], segmentId);
    },
    enabled: !!projectId && !!environmentId && configs.length > 0,
  });
};
