import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { Globe, Plus, Server, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase";
import { useProjectStore } from "@/stores/project-store";

interface Environment {
  id: string;
  name: string;
  projectId: string;
  allowedDomains: string[];
  createdAt: string;
  updatedAt: string;
}

const EnvironmentsPage = () => {
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDomains, setNewDomains] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!selectedProjectId) {
      setEnvironments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const envCollection = collection(
      db,
      "projects",
      selectedProjectId,
      "environments",
    );
    const unsubscribe = onSnapshot(envCollection, (snapshot) => {
      const items: Environment[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Environment, "id">),
      }));
      setEnvironments(items);
      setLoading(false);
    });

    return unsubscribe;
  }, [selectedProjectId]);

  const handleCreate = async () => {
    if (!newName.trim() || !selectedProjectId) return;
    setCreating(true);
    try {
      const envCollection = collection(
        db,
        "projects",
        selectedProjectId,
        "environments",
      );
      const domains = newDomains
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);
      await addDoc(envCollection, {
        name: newName.trim(),
        projectId: selectedProjectId,
        allowedDomains: domains,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setNewName("");
      setNewDomains("");
      setShowForm(false);
      toast.success(t`Environment created`);
    } catch {
      toast.error(t`Failed to create environment`);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (envId: string) => {
    if (!selectedProjectId) return;
    try {
      await deleteDoc(
        doc(db, "projects", selectedProjectId, "environments", envId),
      );
      toast.success(t`Environment deleted`);
    } catch {
      toast.error(t`Failed to delete environment`);
    }
  };

  if (!selectedProjectId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <div className="rounded-full bg-muted p-4">
          <Server className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          <Trans>Select a project to view environments.</Trans>
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <Trans>Environments</Trans>
          </h1>
          <p className="text-sm text-muted-foreground">
            <Trans>Manage deployment targets and allowed domains.</Trans>
          </p>
        </div>
        <Button
          className="gap-2 rounded-full"
          onClick={() => setShowForm(true)}
        >
          <Plus className="h-4 w-4" />
          <Trans>New Environment</Trans>
        </Button>
      </div>

      {/* Inline create form */}
      {showForm && (
        <Card className="rounded-xl">
          <CardContent className="space-y-3 pt-6">
            <Input
              placeholder={t`Environment name (e.g. production, staging)`}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
            <Input
              placeholder={t`Allowed domains (comma-separated, e.g. example.com, app.example.com)`}
              value={newDomains}
              onChange={(e) => setNewDomains(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <div className="flex items-center gap-2">
              <Button
                className="rounded-full"
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
              >
                {creating ? <Trans>Creating...</Trans> : <Trans>Create</Trans>}
              </Button>
              <Button
                variant="ghost"
                className="rounded-full"
                onClick={() => {
                  setShowForm(false);
                  setNewName("");
                  setNewDomains("");
                }}
              >
                <Trans>Cancel</Trans>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Environments list */}
      {environments.length === 0 && !showForm ? (
        <Card className="rounded-xl">
          <CardContent>
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <div className="rounded-full bg-muted p-4">
                <Server className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-medium">
                  <Trans>No environments yet</Trans>
                </p>
                <p className="text-sm text-muted-foreground">
                  <Trans>
                    Add environments like production, staging, or development.
                  </Trans>
                </p>
              </div>
              <Button
                variant="outline"
                className="gap-2 rounded-full"
                onClick={() => setShowForm(true)}
              >
                <Plus className="h-4 w-4" />
                <Trans>Create Environment</Trans>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {environments.map((env) => (
            <Card key={env.id} className="rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">{env.name}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(env.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    <Trans>Allowed domains</Trans>
                  </span>
                </div>
                {env.allowedDomains.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {env.allowedDomains.map((domain) => (
                      <Badge
                        key={domain}
                        variant="secondary"
                        className="rounded-full text-xs"
                      >
                        {domain}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs italic text-muted-foreground">
                    <Trans>None configured</Trans>
                  </p>
                )}
                <p className="font-mono text-xs text-muted-foreground">
                  <Trans>
                    Created {new Date(env.createdAt).toLocaleDateString()}
                  </Trans>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export const Route = createFileRoute("/environments")({
  component: EnvironmentsPage,
});
