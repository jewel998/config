import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { collection, onSnapshot } from "firebase/firestore";
import { Key, Layers, Server } from "lucide-react";
import { useEffect, useState } from "react";

import { OnboardingStepper } from "@/components/onboarding-stepper";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase";
import { useProjectStore } from "@/stores/project-store";

const DashboardContent = () => {
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
  const selectedProject = useProjectStore((s) => s.selectedProject());
  const [envCount, setEnvCount] = useState<number | null>(null);

  useEffect(() => {
    if (!selectedProjectId) {
      setEnvCount(null);
      return;
    }

    const envCollection = collection(
      db,
      "projects",
      selectedProjectId,
      "environments",
    );
    const unsubscribe = onSnapshot(envCollection, (snapshot) => {
      setEnvCount(snapshot.size);
    });

    return unsubscribe;
  }, [selectedProjectId]);

  const stats = [
    {
      title: <Trans>Environments</Trans>,
      value: envCount !== null ? String(envCount) : null,
      description: <Trans>Deployment targets</Trans>,
      icon: Server,
    },
    {
      title: <Trans>Secrets</Trans>,
      value: "0",
      description: <Trans>Encrypted values</Trans>,
      icon: Key,
    },
    {
      title: <Trans>Configs</Trans>,
      value: "0",
      description: <Trans>Published versions</Trans>,
      icon: Layers,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          <Trans>Dashboard</Trans>
        </h1>
        <p className="text-sm text-muted-foreground">
          <Trans>Overview for</Trans>{" "}
          <span className="font-mono text-xs font-medium text-foreground">
            {selectedProject?.name}
          </span>
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat, idx) => (
          <Card key={idx} className="rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {stat.value !== null ? (
                <div className="font-mono text-2xl font-bold">{stat.value}</div>
              ) : (
                <Skeleton className="h-8 w-12" />
              )}
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle>
            <Trans>Recent Activity</Trans>
          </CardTitle>
          <CardDescription>
            <Trans>Latest changes in this project.</Trans>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            <Trans>Activity feed coming soon.</Trans>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const DashboardPage = () => {
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
  const loading = useProjectStore((s) => s.loading);

  if (loading) {
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </div>
    );
  }

  if (!selectedProjectId) {
    return <OnboardingStepper />;
  }

  return <DashboardContent />;
};

export const Route = createFileRoute("/")({
  component: DashboardPage,
});
