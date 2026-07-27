import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { SupportedLocale } from "@/lib/i18n";

export type ThemeMode = "light" | "dark" | "system";

interface AppState {
  // Preferences
  theme: ThemeMode;
  locale: SupportedLocale;
  timezone: string;
  sidebarCollapsed: boolean;

  // Derived / computed
  resolvedTheme: "light" | "dark";

  // Actions
  setTheme: (theme: ThemeMode) => void;
  setLocale: (locale: SupportedLocale) => void;
  setTimezone: (timezone: string) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const getSystemTheme = (): "light" | "dark" => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const getDefaultTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: "system",
      locale: "en",
      timezone: getDefaultTimezone(),
      sidebarCollapsed: false,
      resolvedTheme: getSystemTheme(),

      setTheme: (theme) => {
        const resolved = theme === "system" ? getSystemTheme() : theme;
        set({ theme, resolvedTheme: resolved });
        // Apply to DOM
        const root = document.documentElement;
        if (resolved === "dark") {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
      },

      setLocale: (locale) => {
        set({ locale });
      },

      setTimezone: (timezone) => {
        set({ timezone });
      },

      toggleSidebar: () => {
        set({ sidebarCollapsed: !get().sidebarCollapsed });
      },

      setSidebarCollapsed: (collapsed) => {
        set({ sidebarCollapsed: collapsed });
      },
    }),
    {
      name: "app-preferences",
      partialize: (state) => ({
        theme: state.theme,
        locale: state.locale,
        timezone: state.timezone,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    },
  ),
);

// Listen for system theme changes
if (typeof window !== "undefined") {
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      const { theme, setTheme } = useAppStore.getState();
      if (theme === "system") {
        setTheme("system"); // re-resolve
      }
    });
}
