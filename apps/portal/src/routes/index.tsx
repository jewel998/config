import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Activity, FolderKanban, Key, Server } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/firebase";

const DashboardPage = () => {
  const { user } = useAuth();
  const [projectCount, setProjectCount] = useState(0);
  const [envCount, setEnvCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "projects"),
      where("authorizedUsers", "array-contains", user.uid),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProjectCount(snapshot.size);
      // Count environments across all projects
      let totalEnvs = 0;
      let pending = snapshot.docs.length;

      if (pending === 0) {
        setEnvCount(0);
        return;
      }

      snapshot.docs.forEach((projectDoc) => {
        const envCollection = collection(
          db,
          "projects",
          projectDoc.id,
          "environments",
        );
        onSnapshot(envCollection, (envSnap) => {
          totalEnvs += envSnap.size;
          pending--;
          if (pending === 0) {
            setEnvCount(totalEnvs);
          }
        });
      });
    });

    return unsubscribe;
  }, [user]);

  const stats = [
    {
      title: <Trans>Projects</Trans>,
      value: String(projectCount),
      description: <Trans>Active projects</Trans>,
      icon: FolderKanban,
    },
    {
      title: <Trans>Environments</Trans>,
      value: String(envCount),
      description: <Trans>Deployment targets</Trans>,
      icon: Server,
    },
    {
      title: <Trans>Client Keys</Trans>,
      value: "0",
      description: <Trans>Active clientIds</Trans>,
      icon: Key,
    },
    {
      title: <Trans>Published Configs</Trans>,
      value: "0",
      description: <Trans>Live configurations</Trans>,
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          <Trans>Dashboard</Trans>
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          <Trans>Overview of your configuration platform.</Trans>
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, idx) => (
          <Card key={idx}>
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
            <CardTitle>
              <Trans>Recent Activity</Trans>
            </CardTitle>
            <CardDescription>
              <Trans>Latest changes across your configuration.</Trans>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-[var(--muted-foreground)]">
              <Trans>No activity yet. Create a project to get started.</Trans>
            </div>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>
              <Trans>Quick Start</Trans>
            </CardTitle>
            <CardDescription>
              <Trans>Set up your platform in 3 steps.</Trans>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5 shrink-0">
                1
              </Badge>
              <div>
                <p className="text-sm font-medium">
                  <Trans>Create a Project</Trans>
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  <Trans>Set up your project to scope configs.</Trans>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5 shrink-0">
                2
              </Badge>
              <div>
                <p className="text-sm font-medium">
                  <Trans>Add an Environment</Trans>
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  <Trans>Define deployment targets for your app.</Trans>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5 shrink-0">
                3
              </Badge>
              <div>
                <p className="text-sm font-medium">
                  <Trans>Publish a Version</Trans>
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  <Trans>Push config values to your environments.</Trans>
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
