import { createFileRoute } from "@tanstack/react-router";
import { Plus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const TenantsPage = () => {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenants</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Manage your tenant organizations.
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Tenant
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Tenants</CardTitle>
          <CardDescription>
            Tenants represent organizations that own projects and environments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <div className="rounded-full bg-[var(--muted)] p-4">
              <Users className="h-8 w-8 text-[var(--muted-foreground)]" />
            </div>
            <div className="text-center">
              <p className="font-medium">No tenants yet</p>
              <p className="text-sm text-[var(--muted-foreground)]">
                Create your first tenant to start managing configurations.
              </p>
            </div>
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Tenant
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const Route = createFileRoute("/tenants")({
  component: TenantsPage,
});
