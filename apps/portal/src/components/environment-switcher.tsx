import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { useEnvironments } from "@/hooks/use-environments";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/stores/project-store";
import { useState } from "react";

export const EnvironmentSwitcher = () => {
  const { selectedProjectId, selectedEnvironmentId, setSelectedEnvironmentId } =
    useProjectStore();
  const { data: environments = [] } = useEnvironments(selectedProjectId);

  const selectedEnv = environments.find((e) => e.id === selectedEnvironmentId);

  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={!selectedProjectId}
          className="w-[120px] justify-between rounded-lg text-sm font-medium sm:w-[180px]"
        >
          <span className="truncate">
            {selectedEnv ? selectedEnv.name : t`Select env`}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder={t`Search environments...`} />
          <CommandList>
            <CommandEmpty>
              <Trans>No environments found.</Trans>
            </CommandEmpty>
            <CommandGroup>
              {environments.map((env) => (
                <CommandItem
                  key={env.id}
                  value={env.name}
                  onSelect={() => {
                    setSelectedEnvironmentId(env.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedEnvironmentId === env.id
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                  <span className="truncate">{env.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
