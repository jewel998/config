import { createFileRoute } from "@tanstack/react-router";
import { Plus, Server } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const EnvironmentsPage = () => {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Environments</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Manage deployment targets for your projects.
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Environment
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Environments</CardTitle>
          <CardDescription>
            Environments allow you to publish different configs per deployment
            target (staging, production, etc).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <div className="rounded-full bg-[var(--muted)] p-4">
              <Server className="h-8 w-8 text-[var(--muted-foreground)]" />
            </div>
            <div className="text-center">
              <p className="font-medium">No environments yet</p>
              <p className="text-sm text-[var(--muted-foreground)]">
                Create a project first, then add environments.
              </p>
            </div>
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Environment
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const Route = createFileRoute("/environments")({
  component: EnvironmentsPage,
});
