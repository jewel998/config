import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  message: ReactNode;
  action?: ReactNode;
}

export const EmptyState = ({ icon: Icon, message, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center gap-4 py-24">
    <div className="rounded-full bg-muted p-4">
      <Icon className="h-8 w-8 text-muted-foreground" />
    </div>
    <p className="text-sm text-muted-foreground">{message}</p>
    {action}
  </div>
);
