import { createFileRoute } from "@tanstack/react-router";
import { FolderKanban, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ProjectsPage = () => {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Manage projects and their configuration keys.
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Projects</CardTitle>
          <CardDescription>
            Projects contain configuration definitions and versioned values.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <div className="rounded-full bg-[var(--muted)] p-4">
              <FolderKanban className="h-8 w-8 text-[var(--muted-foreground)]" />
            </div>
            <div className="text-center">
              <p className="font-medium">No projects yet</p>
              <p className="text-sm text-[var(--muted-foreground)]">
                Create a tenant first, then add projects within it.
              </p>
            </div>
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Project
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const Route = createFileRoute("/projects")({
  component: ProjectsPage,
});
