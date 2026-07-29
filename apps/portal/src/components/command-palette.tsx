import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useNavigate } from "@tanstack/react-router";
import {
  GitCompare,
  Key,
  Layers,
  Plus,
  Settings,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Kbd } from "@/components/kbd";
import {
  CommandDialog,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useEnvironments } from "@/hooks/use-environments";
import { useProjects } from "@/hooks/use-projects";
import { useProjectStore } from "@/stores/project-store";

export const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: projects = [] } = useProjects();
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
  const setSelectedProjectId = useProjectStore((s) => s.setSelectedProjectId);
  const setSelectedEnvironmentId = useProjectStore(
    (s) => s.setSelectedEnvironmentId,
  );
  const { data: environments = [] } = useEnvironments(selectedProjectId);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const runAction = (fn: () => void) => {
    fn();
    setOpen(false);
  };

  return (
    <>
      {/* Trigger hint — optional floating button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 hidden items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground shadow-sm transition-colors hover:bg-muted sm:flex"
      >
        <Trans>Command Palette</Trans>
        <Kbd keys="meta+k" />
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command>
          <CommandInput
            placeholder={t`Search commands, projects, environments...`}
          />
          <CommandList>
            <CommandEmpty>
              <Trans>No results found.</Trans>
            </CommandEmpty>

            {/* Navigation */}
            <CommandGroup heading={t`Navigation`}>
              <CommandItem
                onSelect={() => runAction(() => navigate({ to: "/configs" }))}
              >
                <Layers className="h-4 w-4" />
                <span>
                  <Trans>Configs</Trans>
                </span>
              </CommandItem>
              <CommandItem
                onSelect={() => runAction(() => navigate({ to: "/compare" }))}
              >
                <GitCompare className="h-4 w-4" />
                <span>
                  <Trans>Compare Environments</Trans>
                </span>
              </CommandItem>
              <CommandItem
                onSelect={() => runAction(() => navigate({ to: "/api-keys" }))}
              >
                <Key className="h-4 w-4" />
                <span>
                  <Trans>API Keys</Trans>
                </span>
              </CommandItem>
              <CommandItem
                onSelect={() => runAction(() => navigate({ to: "/settings" }))}
              >
                <Settings className="h-4 w-4" />
                <span>
                  <Trans>Project Settings</Trans>
                </span>
              </CommandItem>
              <CommandItem
                onSelect={() =>
                  runAction(() => navigate({ to: "/preferences" }))
                }
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>
                  <Trans>Preferences</Trans>
                </span>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            {/* Projects */}
            {projects.length > 0 && (
              <CommandGroup heading={t`Switch Project`}>
                {projects.map((project) => (
                  <CommandItem
                    key={project.id}
                    onSelect={() =>
                      runAction(() => {
                        setSelectedProjectId(project.id);
                        navigate({ to: "/configs" });
                      })
                    }
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        project.id === selectedProjectId
                          ? "bg-primary"
                          : "bg-muted-foreground/30"
                      }`}
                    />
                    <span>{project.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            <CommandSeparator />

            {/* Environments */}
            {environments.length > 0 && (
              <CommandGroup heading={t`Switch Environment`}>
                {environments.map((env) => (
                  <CommandItem
                    key={env.id}
                    onSelect={() =>
                      runAction(() => {
                        setSelectedEnvironmentId(env.id);
                        navigate({ to: "/configs" });
                      })
                    }
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: env.color || "#9ca3af" }}
                    />
                    <span>{env.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            <CommandSeparator />

            {/* Quick Actions */}
            <CommandGroup heading={t`Actions`}>
              <CommandItem
                onSelect={() =>
                  runAction(() => {
                    navigate({ to: "/configs" });
                    // Dispatch custom event to open config form
                    window.dispatchEvent(new CustomEvent("open-new-config"));
                  })
                }
              >
                <Plus className="h-4 w-4" />
                <span>
                  <Trans>New Config</Trans>
                </span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
};
