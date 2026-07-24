import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Globe, Key, Plus, Server } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
            Manage deployment targets, allowed domains, and client keys.
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Environment
        </Button>
      </div>

      {/* Info cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-[var(--muted-foreground)]" />
              <CardTitle className="text-sm">Domain Allowlisting</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--muted-foreground)]">
              Each environment has a list of allowed domains. Only requests from
              these domains can access config via the SDK. Firebase CORS
              enforcement prevents unauthorized browser access.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-[var(--muted-foreground)]" />
              <CardTitle className="text-sm">Client Keys (clientId)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--muted-foreground)]">
              Generate a clientId per environment to initialize the SDK. The
              clientId is public (like a Firebase API key) and scoped to one
              project + environment.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Localhost warning */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="flex items-start gap-3 pt-6">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-900">
              Localhost domains reduce security
            </p>
            <p className="text-xs text-amber-700">
              Adding <code>localhost</code> to allowed domains should only be
              done for development environments. Anyone with the clientId can
              access config from their local machine.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Empty state */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Environments</CardTitle>
              <CardDescription>
                Environments allow different config values per deployment target
                (development, staging, production).
              </CardDescription>
            </div>
            <Badge variant="secondary">Alpha</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <div className="rounded-full bg-[var(--muted)] p-4">
              <Server className="h-8 w-8 text-[var(--muted-foreground)]" />
            </div>
            <div className="text-center">
              <p className="font-medium">No environments yet</p>
              <p className="text-sm text-[var(--muted-foreground)]">
                Create a project first, then add environments with allowed
                domains and generate clientIds.
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
