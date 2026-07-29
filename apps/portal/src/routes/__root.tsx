import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import {
  Globe,
  History,
  Key,
  Layers,
  LogOut,
  Moon,
  Settings,
  ShieldAlert,
  ShieldX,
  SlidersHorizontal,
  Sun,
  Users,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import { Toaster } from "sonner";

import { EnvironmentSwitcher } from "@/components/environment-switcher";
import { CommandPalette } from "@/components/command-palette";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/error-boundary";
import {
  type SupportedLocale,
  localeNames,
  loadCatalog,
  storeLocale,
} from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useAuthStore } from "@/stores/auth-store";
import { useProjectStore } from "@/stores/project-store";
import { cn } from "@/lib/utils";

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

  const handleChange = (locale: SupportedLocale) => {
    storeLocale(locale);
    loadCatalog(locale);
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
            <Button
              key={code}
              variant="ghost"
              size="sm"
              onClick={() => handleChange(code)}
              className={cn(
                "w-full justify-start rounded-md px-3 py-1.5 text-sm h-auto",
                currentLocale === code
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground",
              )}
            >
              {name}
            </Button>
          ),
        )}
      </PopoverContent>
    </Popover>
  );
};

const UserMenu = () => {
  const user = useAuthStore((s) => s.user);
  const logOut = useAuthStore((s) => s.logOut);

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
        <Link to="/preferences">
          <DropdownMenuItem className="gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            <Trans>Preferences</Trans>
          </DropdownMenuItem>
        </Link>
        <Link to="/gdpr">
          <DropdownMenuItem className="gap-2">
            <ShieldAlert className="h-4 w-4" />
            <Trans>GDPR & Privacy</Trans>
          </DropdownMenuItem>
        </Link>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logOut} className="gap-2">
          <LogOut className="h-4 w-4" />
          <Trans>Sign out</Trans>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const TopBar = () => {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background px-3 sm:gap-4 sm:px-4">
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <Settings className="h-5 w-5 text-[#5683da]" />
        <span className="hidden text-sm font-semibold md:inline-block">
          <Trans>Config</Trans>
        </span>
        <Badge className="hidden rounded-full bg-[#ff8964]/12 text-[10px] font-semibold uppercase tracking-wider text-[#ff8964] hover:bg-[#ff8964]/12 sm:inline-flex">
          Beta
        </Badge>
      </div>

      {/* Project switcher */}
      <ProjectSwitcher />

      {/* Environment switcher */}
      <EnvironmentSwitcher />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side actions */}
      <div className="flex items-center gap-1">
        <div className="hidden sm:flex sm:items-center sm:gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
        <UserMenu />
      </div>
    </header>
  );
};

const TabNav = () => {
  const tabs = [
    { to: "/configs" as const, label: <Trans>Configs</Trans>, icon: Layers },
    { to: "/segments" as const, label: <Trans>Segments</Trans>, icon: Users },
    { to: "/api-keys" as const, label: <Trans>API Keys</Trans>, icon: Key },
    { to: "/audit" as const, label: <Trans>Audit</Trans>, icon: History },
    { to: "/team" as const, label: <Trans>Team</Trans>, icon: UsersRound },
    {
      to: "/settings" as const,
      label: <Trans>Settings</Trans>,
      icon: Settings,
    },
  ];

  return (
    <nav className="border-b px-4">
      <div className="flex gap-1 overflow-x-auto">
        {tabs.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground [&.active]:border-b-2 [&.active]:border-primary [&.active]:text-foreground"
            activeProps={{ className: "active" }}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

const AuthenticatedLayout = () => {
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId);

  return (
    <>
      <div className="flex min-h-screen flex-col">
        <TopBar />
        {/* Always render TabNav container to avoid CLS when project gets selected.
            The nav collapses to 0 height when hidden via CSS instead of unmounting. */}
        <div
          className={cn(
            "overflow-hidden transition-[max-height] duration-150",
            selectedProjectId ? "max-h-12" : "max-h-0",
          )}
        >
          <TabNav />
        </div>
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <CommandPalette />
      <Toaster richColors position="bottom-right" />
    </>
  );
};

const AccessDeniedPage = () => {
  const logOut = useAuthStore((s) => s.logOut);
  const signIn = useAuthStore((s) => s.signIn);

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
  const signIn = useAuthStore((s) => s.signIn);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      {/* Background gradient decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-[#5683da]/5 blur-3xl" />
        <div className="absolute -bottom-1/2 right-0 h-[600px] w-[600px] rounded-full bg-[#ff8964]/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-8">
        {/* Logo + heading */}
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5683da]/10">
            <Settings className="h-7 w-7 text-[#5683da]" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            <Trans>Config Portal</Trans>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            <Trans>Sign in to manage your configuration platform.</Trans>
          </p>
        </div>

        {/* Sign in card */}
        <div className="rounded-2xl border bg-card p-8">
          <div className="space-y-6">
            {/* Features */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs font-medium">
                  <Trans>Projects</Trans>
                </p>
                <p className="text-[10px] text-muted-foreground">
                  <Trans>Multi-project scoping</Trans>
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs font-medium">
                  <Trans>Environments</Trans>
                </p>
                <p className="text-[10px] text-muted-foreground">
                  <Trans>Per-env overrides</Trans>
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs font-medium">
                  <Trans>Versioned</Trans>
                </p>
                <p className="text-[10px] text-muted-foreground">
                  <Trans>Config publishing</Trans>
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs font-medium">
                  <Trans>Real-time</Trans>
                </p>
                <p className="text-[10px] text-muted-foreground">
                  <Trans>Firebase sync</Trans>
                </p>
              </div>
            </div>

            {/* Sign in button */}
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
            </p>
          </div>
        </div>

        {/* Beta notice */}
        <div className="text-center">
          <Badge className="rounded-full bg-[#ff8964]/12 text-[10px] font-semibold uppercase tracking-wider text-[#ff8964] hover:bg-[#ff8964]/12">
            Beta
          </Badge>
          <p className="mt-2 text-[11px] text-muted-foreground">
            <Trans>
              Access is by request only. Rights of Admission Reserved.
            </Trans>
          </p>
        </div>
      </div>
    </div>
  );
};

const RootLayout = () => {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const accessDenied = useAuthStore((s) => s.accessDenied);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        {/* Skeleton top bar */}
        <div className="flex h-14 items-center gap-4 border-b px-4">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-8 w-40 rounded-lg" />
          <Skeleton className="h-8 w-36 rounded-lg" />
          <div className="flex-1" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        {/* Skeleton tabs */}
        <div className="flex gap-4 border-b px-4 py-3">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-16" />
        </div>
        {/* Skeleton content */}
        <div className="flex-1 space-y-6 p-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
          <Skeleton className="h-48 rounded-xl" />
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
