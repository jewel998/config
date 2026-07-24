import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import {
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Server,
  Settings,
  ShieldX,
  Sun,
  Key,
  X,
} from "lucide-react";
import { useState } from "react";
import { Toaster } from "sonner";

import { ProjectSwitcher } from "@/components/project-switcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/lib/auth";
import {
  type SupportedLocale,
  localeNames,
  loadCatalog,
  storeLocale,
} from "@/lib/i18n";
import { ProjectProvider, useProject } from "@/lib/project-context";
import { useTheme } from "@/lib/theme";

const navItems = [
  { to: "/" as const, label: <Trans>Dashboard</Trans>, icon: LayoutDashboard },
  {
    to: "/environments" as const,
    label: <Trans>Environments</Trans>,
    icon: Server,
  },
  { to: "/secrets" as const, label: <Trans>Secrets</Trans>, icon: Key },
  {
    to: "/settings" as const,
    label: <Trans>Settings</Trans>,
    icon: Settings,
  },
];

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
};

const LanguageSwitcher = () => {
  const { i18n } = useLingui();
  const currentLocale = i18n.locale as SupportedLocale;
  const [open, setOpen] = useState(false);

  const handleChange = async (locale: SupportedLocale) => {
    storeLocale(locale);
    await loadCatalog(locale);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Globe className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-1" align="end">
        {(Object.entries(localeNames) as [SupportedLocale, string][]).map(
          ([code, name]) => (
            <button
              key={code}
              onClick={() => handleChange(code)}
              className={`flex w-full items-center rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent ${
                currentLocale === code ? "font-medium text-primary" : ""
              }`}
            >
              {name}
            </button>
          ),
        )}
      </PopoverContent>
    </Popover>
  );
};

const UserMenu = () => {
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
          <Avatar className="h-8 w-8">
            {user?.photoURL && <AvatarImage src={user.photoURL} alt="" />}
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-3 py-2">
          <p className="text-sm font-medium">{user?.displayName ?? "User"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {user?.email}
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logOut} className="gap-2">
          <LogOut className="h-4 w-4" />
          <Trans>Sign out</Trans>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const TopBar = ({ onMenuClick }: { onMenuClick: () => void }) => {
  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4">
      {/* Mobile menu button */}
      <button
        className="rounded-md p-1.5 hover:bg-accent lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Logo */}
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-[#5683da]" />
        <span className="hidden text-sm font-semibold sm:inline-block">
          <Trans>Config</Trans>
        </span>
        <Badge className="hidden rounded-full bg-[#ff8964]/12 text-[10px] font-semibold uppercase tracking-wider text-[#ff8964] hover:bg-[#ff8964]/12 sm:inline-flex">
          Beta
        </Badge>
      </div>

      {/* Project switcher */}
      <ProjectSwitcher />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side actions */}
      <div className="flex items-center gap-1">
        <LanguageSwitcher />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
};

const Sidebar = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { selectedProjectId } = useProject();

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
        className={`fixed inset-y-0 left-0 top-14 z-50 flex w-60 flex-col border-r bg-sidebar transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Mobile close */}
        <div className="flex items-center justify-end p-2 lg:hidden">
          <button
            className="rounded-md p-1 hover:bg-sidebar-accent"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        {selectedProjectId ? (
          <nav className="flex-1 space-y-1 p-3">
            {navItems.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={onClose}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground transition-colors duration-150 hover:bg-sidebar-accent"
                activeProps={{
                  className:
                    "bg-[#5683da]/10 text-[#5683da] font-medium hover:bg-[#5683da]/10",
                }}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        ) : (
          <div className="flex flex-1 items-center justify-center p-6">
            <p className="text-center text-xs text-muted-foreground">
              <Trans>Select or create a project to get started.</Trans>
            </p>
          </div>
        )}
      </aside>
    </>
  );
};

const AuthenticatedLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ProjectProvider>
      <div className="flex min-h-screen flex-col">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <div className="flex flex-1">
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
      <Toaster richColors position="bottom-right" />
    </ProjectProvider>
  );
};

const AccessDeniedPage = () => {
  const { logOut, signIn } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border bg-red-50 dark:bg-red-950/20">
          <ShieldX className="h-8 w-8 text-red-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            <Trans>Access Denied</Trans>
          </h1>
          <p className="text-sm text-muted-foreground">
            <Trans>
              Your account is not authorized to access this portal. Contact the
              project owner to request access.
            </Trans>
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button onClick={signIn} className="w-full rounded-full">
            <Trans>Try a different account</Trans>
          </Button>
          <Button
            variant="outline"
            onClick={logOut}
            className="w-full gap-2 rounded-full"
          >
            <LogOut className="h-4 w-4" />
            <Trans>Sign out</Trans>
          </Button>
        </div>
      </div>
    </div>
  );
};

const LoginPage = () => {
  const { signIn } = useAuth();

  return (
    <div className="flex min-h-screen">
      {/* Left side - branding */}
      <div className="hidden flex-1 items-center justify-center bg-[#5683da] lg:flex">
        <div className="max-w-md space-y-4 px-8 text-white">
          <Settings className="h-12 w-12" />
          <h1 className="text-3xl font-bold">
            <Trans>Config Portal</Trans>
          </h1>
          <p className="text-lg opacity-90">
            <Trans>
              Manage multi-tenant configuration with versioned publish flows,
              offline-ready cache, and real-time remote sync.
            </Trans>
          </p>
          <ul className="space-y-2 pt-4 text-sm opacity-80">
            <li className="flex items-center gap-2">
              <Trans>✓ Multi-tenant & multi-project scoping</Trans>
            </li>
            <li className="flex items-center gap-2">
              <Trans>✓ Environment-specific overrides</Trans>
            </li>
            <li className="flex items-center gap-2">
              <Trans>✓ Versioned config publishing</Trans>
            </li>
            <li className="flex items-center gap-2">
              <Trans>✓ Firebase-powered real-time sync</Trans>
            </li>
          </ul>
        </div>
      </div>

      {/* Right side - sign in */}
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2 text-center">
            <Settings className="mx-auto h-10 w-10 text-[#5683da] lg:hidden" />
            <h1 className="text-2xl font-bold tracking-tight">
              <Trans>Welcome back</Trans>
            </h1>
            <p className="text-sm text-muted-foreground">
              <Trans>Sign in to manage your configuration platform.</Trans>
            </p>
          </div>

          <Button
            onClick={signIn}
            size="lg"
            className="w-full gap-2 rounded-full"
          >
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
            <Trans>Sign in with Google</Trans>
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            <Trans>Protected by Firebase Authentication.</Trans>
            <br />
            <Trans>Only authorized team members can access this portal.</Trans>
          </p>

          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
            <p className="text-center text-xs text-amber-800 dark:text-amber-200">
              <strong>
                <Trans>Access is by request only.</Trans>
              </strong>
              <br />
              <Trans>
                Rights of Admission Reserved. Contact the project owner to
                request access.
              </Trans>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const RootLayout = () => {
  const { user, loading, accessDenied } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#5683da] border-t-transparent" />
          <p className="text-sm text-muted-foreground">
            <Trans>Loading...</Trans>
          </p>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return <AccessDeniedPage />;
  }

  if (!user) {
    return <LoginPage />;
  }

  return <AuthenticatedLayout />;
};

export const Route = createRootRoute({
  component: RootLayout,
});
