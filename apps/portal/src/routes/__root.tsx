import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import {
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Server,
  Settings,
  X,
} from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const navItems = [
  { to: "/" as const, label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects" as const, label: "Projects", icon: FolderKanban },
  { to: "/environments" as const, label: "Environments", icon: Server },
];

const Sidebar = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { user, logOut } = useAuth();

  const initials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  return (
    <>
      {/* Backdrop for mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-[var(--sidebar)] transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-[var(--sidebar-primary)]" />
            <span className="text-sm font-semibold">Config Portal</span>
          </div>
          <button
            className="rounded-md p-1 hover:bg-[var(--sidebar-accent)] lg:hidden"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={onClose}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--sidebar-foreground)] transition-colors hover:bg-[var(--sidebar-accent)]"
              activeProps={{
                className:
                  "bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)] font-medium",
              }}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <Avatar className="h-8 w-8">
              {user?.photoURL && <AvatarImage src={user.photoURL} alt="" />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 truncate">
              <p className="truncate text-sm font-medium">
                {user?.displayName ?? "User"}
              </p>
              <p className="truncate text-xs text-[var(--muted-foreground)]">
                {user?.email}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 w-full justify-start gap-2 text-[var(--muted-foreground)]"
            onClick={logOut}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>
    </>
  );
};

const AuthenticatedLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col">
        {/* Top bar for mobile */}
        <header className="flex h-14 items-center gap-4 border-b bg-[var(--background)] px-4 lg:hidden">
          <button
            className="rounded-md p-1.5 hover:bg-[var(--accent)]"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold">Config Portal</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const LoginPage = () => {
  const { signIn } = useAuth();

  return (
    <div className="flex min-h-screen">
      {/* Left side - branding */}
      <div className="hidden flex-1 items-center justify-center bg-[var(--primary)] lg:flex">
        <div className="max-w-md space-y-4 px-8 text-[var(--primary-foreground)]">
          <Settings className="h-12 w-12" />
          <h1 className="text-3xl font-bold">Config Portal</h1>
          <p className="text-lg opacity-90">
            Manage multi-tenant configuration with versioned publish flows,
            offline-ready cache, and real-time remote sync.
          </p>
          <ul className="space-y-2 pt-4 text-sm opacity-80">
            <li className="flex items-center gap-2">
              ✓ Multi-tenant & multi-project scoping
            </li>
            <li className="flex items-center gap-2">
              ✓ Environment-specific overrides
            </li>
            <li className="flex items-center gap-2">
              ✓ Versioned config publishing
            </li>
            <li className="flex items-center gap-2">
              ✓ Firebase-powered real-time sync
            </li>
          </ul>
        </div>
      </div>

      {/* Right side - sign in */}
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2 text-center">
            <Settings className="mx-auto h-10 w-10 lg:hidden" />
            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              Sign in to manage your configuration platform.
            </p>
          </div>

          <Button onClick={signIn} size="lg" className="w-full gap-2">
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign in with Google
          </Button>

          <p className="text-center text-xs text-[var(--muted-foreground)]">
            Protected by Firebase Authentication.
            <br />
            Only authorized team members can access this portal.
          </p>
        </div>
      </div>
    </div>
  );
};

const RootLayout = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
          <p className="text-sm text-[var(--muted-foreground)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <AuthenticatedLayout />;
};

export const Route = createRootRoute({
  component: RootLayout,
});
