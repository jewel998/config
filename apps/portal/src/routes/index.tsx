import { createFileRoute } from "@tanstack/react-router";
import { Activity, FolderKanban, Key, Server } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const stats = [
  {
    title: "Projects",
    value: "0",
    description: "Active projects",
    icon: FolderKanban,
    trend: "No data yet",
  },
  {
    title: "Environments",
    value: "0",
    description: "Deployment targets",
    icon: Server,
    trend: "No data yet",
  },
  {
    title: "Client Keys",
    value: "0",
    description: "Active clientIds",
    icon: Key,
    trend: "No data yet",
  },
  {
    title: "Published Configs",
    value: "0",
    description: "Live configurations",
    icon: Activity,
    trend: "No data yet",
  },
];

const DashboardPage = () => {
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Overview of your configuration platform.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-[var(--muted-foreground)]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-[var(--muted-foreground)]">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content area */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Recent activity */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest changes across your configuration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-[var(--muted-foreground)]">
              No activity yet. Create a tenant to get started.
            </div>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Quick Start</CardTitle>
            <CardDescription>Set up your platform in 3 steps.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5 shrink-0">
                1
              </Badge>
              <div>
                <p className="text-sm font-medium">Create a Tenant</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Set up your organization to scope configs.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5 shrink-0">
                2
              </Badge>
              <div>
                <p className="text-sm font-medium">Add a Project</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Define configuration keys for your app.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5 shrink-0">
                3
              </Badge>
              <div>
                <p className="text-sm font-medium">Publish a Version</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Push config values to your environments.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export const Route = createFileRoute("/")({
  component: DashboardPage,
});
