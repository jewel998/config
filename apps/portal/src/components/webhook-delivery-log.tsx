import { Trans } from "@lingui/react/macro";
import { CheckCircle2, XCircle, FlaskConical } from "lucide-react";

import { DateDisplay } from "@/components/date-display";
import { Badge } from "@/components/ui/badge";
import { useWebhookDeliveries } from "@/hooks/use-webhook-deliveries";

interface WebhookDeliveryLogProps {
  projectId: string;
  webhookId: string;
}

export const WebhookDeliveryLog = ({
  projectId,
  webhookId,
}: WebhookDeliveryLogProps) => {
  const { data: deliveries = [], isLoading } = useWebhookDeliveries(
    projectId,
    webhookId,
  );

  if (isLoading)
    return (
      <p className="text-xs text-muted-foreground py-2">
        <Trans>Loading...</Trans>
      </p>
    );
  if (deliveries.length === 0)
    return (
      <p className="text-xs text-muted-foreground py-2">
        <Trans>No deliveries yet</Trans>
      </p>
    );

  return (
    <div className="space-y-1.5 max-h-48 overflow-y-auto">
      {deliveries.map((d) => (
        <div
          key={d.id}
          className="flex items-center gap-2 text-xs rounded border px-2 py-1.5"
        >
          {d.success ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
          )}
          <DateDisplay
            date={d.timestamp}
            className="text-[10px] text-muted-foreground"
          />
          {d.httpStatus && (
            <Badge variant="outline" className="text-[10px] px-1 py-0">
              {d.httpStatus}
            </Badge>
          )}
          <span className="text-muted-foreground">{d.duration}ms</span>
          {d.isTest && (
            <FlaskConical className="h-3 w-3 text-muted-foreground" />
          )}
          {d.error && (
            <span className="text-red-500 truncate flex-1">{d.error}</span>
          )}
        </div>
      ))}
    </div>
  );
};
