import { createFileRoute } from "@tanstack/react-router";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const TenantsPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tenants</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Your Tenants</CardTitle>
          <CardDescription>
            Manage tenant organizations and their access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--muted-foreground)]">
            No tenants yet. Create your first tenant to get started.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export const Route = createFileRoute("/tenants")({
  component: TenantsPage,
});
