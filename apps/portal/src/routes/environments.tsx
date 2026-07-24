import { createFileRoute } from "@tanstack/react-router";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const EnvironmentsPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Environments</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Your Environments</CardTitle>
          <CardDescription>
            Manage deployment environments for your projects.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--muted-foreground)]">
            No environments yet. Create a project first, then add environments.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export const Route = createFileRoute("/environments")({
  component: EnvironmentsPage,
});
