import { createFileRoute } from "@tanstack/react-router";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { Globe, Plus, Server, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/firebase";

interface Project {
  id: string;
  name: string;
}

interface Environment {
  id: string;
  name: string;
  projectId: string;
  allowedDomains: string[];
  createdAt: string;
  updatedAt: string;
}

const EnvironmentsPage = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  // Load projects for the selector
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "projects"),
      where("authorizedUsers", "array-contains", user.uid),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Project[] = snapshot.docs.map((d) => ({
        id: d.id,
        name: d.data().name as string,
      }));
      setProjects(items);
      if (items.length > 0 && !selectedProjectId) {
        setSelectedProjectId(items[0].id);
      }
    });

    return unsubscribe;
  }, [user]);

  // Load environments for the selected project
  useEffect(() => {
    if (!selectedProjectId) {
      setEnvironments([]);
      return;
    }

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
      await addDoc(envCollection, {
        name: newName.trim(),
        projectId: selectedProjectId,
        allowedDomains: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setNewName("");
      setShowForm(false);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (envId: string) => {
    if (!selectedProjectId) return;
    await deleteDoc(
      doc(db, "projects", selectedProjectId, "environments", envId),
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Environments</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Manage deployment targets, allowed domains, and client keys.
          </p>
        </div>
        <Button
          className="gap-2"
          onClick={() => setShowForm(true)}
          disabled={!selectedProjectId}
        >
          <Plus className="h-4 w-4" />
          New Environment
        </Button>
      </div>

      {/* Project selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Project:</label>
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="rounded-md border bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--ring)]"
        >
          {projects.length === 0 && (
            <option value="">No projects available</option>
          )}
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Inline create form */}
      {showForm && (
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <input
              type="text"
              placeholder="Environment name (e.g. production, staging)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="flex-1 rounded-md border bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--ring)]"
              autoFocus
            />
            <Button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
            >
              {creating ? "Creating..." : "Create"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowForm(false);
                setNewName("");
              }}
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Environments list */}
      {!selectedProjectId ? (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <div className="rounded-full bg-[var(--muted)] p-4">
                <Server className="h-8 w-8 text-[var(--muted-foreground)]" />
              </div>
              <div className="text-center">
                <p className="font-medium">No project selected</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Create a project first, then add environments.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : environments.length === 0 && !showForm ? (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <div className="rounded-full bg-[var(--muted)] p-4">
                <Server className="h-8 w-8 text-[var(--muted-foreground)]" />
              </div>
              <div className="text-center">
                <p className="font-medium">No environments yet</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Add environments like production, staging, or development.
                </p>
              </div>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setShowForm(true)}
              >
                <Plus className="h-4 w-4" />
                Create Environment
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {environments.map((env) => (
            <Card key={env.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">{env.name}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[var(--muted-foreground)] hover:text-[var(--destructive)]"
                  onClick={() => handleDelete(env.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                  <span className="text-xs text-[var(--muted-foreground)]">
                    Allowed domains:
                  </span>
                </div>
                {env.allowedDomains.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {env.allowedDomains.map((domain) => (
                      <Badge
                        key={domain}
                        variant="secondary"
                        className="text-xs"
                      >
                        {domain}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--muted-foreground)] italic">
                    None configured
                  </p>
                )}
                <p className="text-xs text-[var(--muted-foreground)]">
                  Created {new Date(env.createdAt).toLocaleDateString()}
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
