import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { Check, ChevronsUpDown, Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { DateDisplay } from "@/components/date-display";
import { PageHeader } from "@/components/page-header";
import { SegmentedControl } from "@/components/segmented-control";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type SupportedLocale,
  loadCatalog,
  localeNames,
  storeLocale,
} from "@/lib/i18n";
import { type Theme, useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

const TIMEZONE_STORAGE_KEY = "timezone";

const getStoredTimezone = (): string => {
  try {
    return (
      localStorage.getItem(TIMEZONE_STORAGE_KEY) ??
      Intl.DateTimeFormat().resolvedOptions().timeZone
    );
  } catch {
    return "UTC";
  }
};

// --- Theme Card ---

const ThemeCard = () => {
  const { theme, setTheme } = useTheme();
  const themes: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="text-base">
          <Trans>Theme</Trans>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          {themes.map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              variant={theme === value ? "default" : "outline"}
              className="min-w-20 gap-2 rounded-full"
              onClick={() => setTheme(value)}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// --- Region Card ---

const RegionCard = () => {
  const [locale, setLocale] = useState<SupportedLocale>(() => {
    try {
      const stored = localStorage.getItem("locale");
      if (stored && stored in localeNames) return stored as SupportedLocale;
    } catch {
      // ignore
    }
    return "en";
  });
  const [timezone, setTimezone] = useState(getStoredTimezone);
  const [tzOpen, setTzOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  const allTimezones = useMemo(() => {
    try {
      return Intl.supportedValuesOf("timeZone");
    } catch {
      return ["UTC", "America/New_York", "Europe/London", "Asia/Tokyo"];
    }
  }, []);

  useEffect(() => {
    const update = () => {
      try {
        setCurrentTime(
          new Date().toLocaleTimeString(undefined, {
            timeZone: timezone,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        );
      } catch {
        setCurrentTime("--:--:--");
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [timezone]);

  const handleLocaleChange = (value: string) => {
    const loc = value as SupportedLocale;
    setLocale(loc);
    storeLocale(loc);
    loadCatalog(loc);
  };

  const handleTimezoneChange = (value: string) => {
    setTimezone(value);
    setTzOpen(false);
    try {
      localStorage.setItem(TIMEZONE_STORAGE_KEY, value);
    } catch {
      // ignore
    }
  };

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="text-base">
          <Trans>Language & Region</Trans>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Language */}
          <div className="space-y-2">
            <p className="text-sm font-medium">
              <Trans>Language</Trans>
            </p>
            <Select value={locale} onValueChange={handleLocaleChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(localeNames) as [SupportedLocale, string][]
                ).map(([code, name]) => (
                  <SelectItem key={code} value={code}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <p className="text-sm font-medium">
              <Trans>Timezone</Trans>
            </p>
            <Popover open={tzOpen} onOpenChange={setTzOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={tzOpen}
                  className="w-full justify-between rounded-lg text-sm font-normal"
                >
                  <span className="truncate">{timezone}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-full min-w-[280px] p-0"
                align="start"
              >
                <Command>
                  <CommandInput placeholder="Search timezones..." />
                  <CommandList>
                    <CommandEmpty>
                      <Trans>No timezone found.</Trans>
                    </CommandEmpty>
                    <CommandGroup>
                      {allTimezones.map((tz) => (
                        <CommandItem
                          key={tz}
                          value={tz}
                          onSelect={() => handleTimezoneChange(tz)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              timezone === tz ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <span className="truncate">{tz}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Trans>Current time:</Trans>
              <span className="font-mono">{currentTime}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// --- Account Card ---

const AccountCard = () => {
  const user = useAuthStore((s) => s.user);

  if (!user) return null;

  const initials = user.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  return (
    <>
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">
            <Trans>Profile</Trans>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              {user.photoURL && (
                <AvatarImage src={user.photoURL} alt={user.displayName ?? ""} />
              )}
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="text-lg font-medium">
                {user.displayName ?? "User"}
              </p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                <Trans>Display Name</Trans>
              </p>
              <p className="mt-1 text-sm">
                {user.displayName ?? <Trans>Not set</Trans>}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                <Trans>Email</Trans>
              </p>
              <p className="mt-1 font-mono text-sm">{user.email}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                <Trans>User ID</Trans>
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {user.uid}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                <Trans>Account Created</Trans>
              </p>
              <p className="mt-1 text-sm">
                {user.metadata.creationTime ? (
                  <DateDisplay date={user.metadata.creationTime} />
                ) : (
                  "—"
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            <Trans>Danger Zone</Trans>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            <Trans>
              Account deletion is not yet available. Contact support if you need
              to delete your account.
            </Trans>
          </p>
        </CardContent>
      </Card>
    </>
  );
};

// --- Main Page ---

const PreferencesPage = () => {
  const [tab, setTab] = useState<"preferences" | "account">("preferences");

  return (
    <div className="space-y-6">
      <PageHeader
        title={<Trans>Preferences</Trans>}
        description={<Trans>Customize your portal experience.</Trans>}
      />

      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: "preferences", label: <Trans>Preferences</Trans> },
          { value: "account", label: <Trans>Account</Trans> },
        ]}
      />

      {tab === "preferences" && (
        <>
          <ThemeCard />
          <RegionCard />
        </>
      )}

      {tab === "account" && <AccountCard />}
    </div>
  );
};

export const Route = createFileRoute("/preferences")({
  component: PreferencesPage,
});
