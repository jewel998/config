import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  type SupportedLocale,
  loadCatalog,
  localeNames,
  storeLocale,
} from "@/lib/i18n";
import { type Theme, useTheme } from "@/lib/theme";

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

const PreferencesPage = () => {
  const { theme, setTheme } = useTheme();
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
  const [tzSearch, setTzSearch] = useState("");
  const [currentTime, setCurrentTime] = useState("");

  const allTimezones = useMemo(() => {
    try {
      return Intl.supportedValuesOf("timeZone");
    } catch {
      return ["UTC", "America/New_York", "Europe/London", "Asia/Tokyo"];
    }
  }, []);

  const filteredTimezones = useMemo(() => {
    if (!tzSearch) return allTimezones;
    const lower = tzSearch.toLowerCase();
    return allTimezones.filter((tz) => tz.toLowerCase().includes(lower));
  }, [allTimezones, tzSearch]);

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
    try {
      localStorage.setItem(TIMEZONE_STORAGE_KEY, value);
    } catch {
      // ignore
    }
  };

  const themes: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          <Trans>Preferences</Trans>
        </h1>
        <p className="text-sm text-muted-foreground">
          <Trans>Customize your portal experience.</Trans>
        </p>
      </div>

      {/* Theme */}
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

      {/* Language */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">
            <Trans>Language</Trans>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={locale} onValueChange={handleLocaleChange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(localeNames) as [SupportedLocale, string][]).map(
                ([code, name]) => (
                  <SelectItem key={code} value={code}>
                    {name}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Timezone */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base">
            <Trans>Timezone</Trans>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Search timezones..."
              value={tzSearch}
              onChange={(e) => setTzSearch(e.target.value)}
              className="max-w-xs"
            />
            <select
              className="w-full max-w-xs rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
              value={timezone}
              onChange={(e) => handleTimezoneChange(e.target.value)}
              size={8}
            >
              {filteredTimezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Trans>Current time:</Trans>
            <span className="font-mono">{currentTime}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const Route = createFileRoute("/preferences")({
  component: PreferencesPage,
});
