import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
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
import { FolderKanban, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/firebase";

interface Project {
  id: string;
  name: string;
  ownerId: string;
  authorizedUsers: string[];
  createdAt: string;
  updatedAt: string;
}

const ProjectsPage = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "projects"),
      where("authorizedUsers", "array-contains", user.uid),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Project[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Project, "id">),
      }));
      setProjects(items);
    });

    return unsubscribe;
  }, [user]);

  const handleCreate = async () => {
    if (!newName.trim() || !user) return;
    setCreating(true);
    try {
      await addDoc(collection(db, "projects"), {
        name: newName.trim(),
        ownerId: user.uid,
        authorizedUsers: [user.uid],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setNewName("");
      setShowForm(false);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (projectId: string) => {
    await deleteDoc(doc(db, "projects", projectId));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <Trans>Projects</Trans>
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            <Trans>Manage your projects, environments, and config keys.</Trans>
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          <Trans>New Project</Trans>
        </Button>
      </div>

      {/* Inline create form */}
      {showForm && (
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <input
              type="text"
              placeholder={t`Project name`}
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
              {creating ? <Trans>Creating...</Trans> : <Trans>Create</Trans>}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowForm(false);
                setNewName("");
              }}
            >
              <Trans>Cancel</Trans>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Projects list */}
      {projects.length === 0 && !showForm ? (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <div className="rounded-full bg-[var(--muted)] p-4">
                <FolderKanban className="h-8 w-8 text-[var(--muted-foreground)]" />
              </div>
              <div className="text-center">
                <p className="font-medium">
                  <Trans>No projects yet</Trans>
                </p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  <Trans>
                    Create your first project to start managing feature flags
                    and configs.
                  </Trans>
                </p>
              </div>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setShowForm(true)}
              >
                <Plus className="h-4 w-4" />
                <Trans>Create Project</Trans>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">{project.name}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[var(--muted-foreground)] hover:text-[var(--destructive)]"
                  onClick={() => handleDelete(project.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-[var(--muted-foreground)]">
                  <Trans>
                    Created {new Date(project.createdAt).toLocaleDateString()}
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

export const Route = createFileRoute("/projects")({
  component: ProjectsPage,
});
