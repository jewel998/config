import { createRootRoute, Outlet, Link } from "@tanstack/react-router";
import {
  LogOut,
  LayoutDashboard,
  Users,
  FolderKanban,
  Server,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const RootLayout = () => {
  const { user, loading, signIn, logOut } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--muted-foreground)]">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Config Portal</h1>
        <p className="text-[var(--muted-foreground)]">
          Sign in to manage your configuration.
        </p>
        <Button onClick={signIn}>Sign in with Google</Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r bg-[var(--sidebar)] p-4">
        <h2 className="mb-6 text-lg font-semibold">Config Portal</h2>
        <nav className="flex flex-col gap-1">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-[var(--sidebar-accent)]"
            activeProps={{
              className: "bg-[var(--sidebar-accent)] font-medium",
            }}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          <Link
            to="/tenants"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-[var(--sidebar-accent)]"
            activeProps={{
              className: "bg-[var(--sidebar-accent)] font-medium",
            }}
          >
            <Users className="h-4 w-4" />
            Tenants
          </Link>
          <Link
            to="/projects"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-[var(--sidebar-accent)]"
            activeProps={{
              className: "bg-[var(--sidebar-accent)] font-medium",
            }}
          >
            <FolderKanban className="h-4 w-4" />
            Projects
          </Link>
          <Link
            to="/environments"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-[var(--sidebar-accent)]"
            activeProps={{
              className: "bg-[var(--sidebar-accent)] font-medium",
            }}
          >
            <Server className="h-4 w-4" />
            Environments
          </Link>
        </nav>
        <div className="mt-auto pt-6">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={logOut}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
};

export const Route = createRootRoute({
  component: RootLayout,
});
