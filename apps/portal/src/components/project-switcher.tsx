import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { addDoc, collection } from "firebase/firestore";
import { Check, ChevronsUpDown, FolderPlus, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useProjectStore } from "@/stores/project-store";

export const ProjectSwitcher = () => {
  const user = useAuthStore((s) => s.user);
  const { projects, selectedProjectId, setSelectedProjectId } =
    useProjectStore();
  const selectedProject = useProjectStore((s) => s.selectedProject());
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim() || !user) return;
    setCreating(true);
    try {
      const docRef = await addDoc(collection(db, "projects"), {
        name: newName.trim(),
        ownerId: user.uid,
        authorizedUsers: [user.uid],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setSelectedProjectId(docRef.id);
      setNewName("");
      setShowCreate(false);
      setOpen(false);
      toast.success(t`Project created`);
    } catch {
      toast.error(t`Failed to create project`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between rounded-lg text-sm font-medium"
        >
          <span className="truncate">
            {selectedProject ? selectedProject.name : t`Select project`}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="start">
        <Command>
          <CommandInput placeholder={t`Search projects...`} />
          <CommandList>
            <CommandEmpty>
              <Trans>No projects found.</Trans>
            </CommandEmpty>
            <CommandGroup>
              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={project.name}
                  onSelect={() => {
                    setSelectedProjectId(project.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedProjectId === project.id
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                  <span className="truncate">{project.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          <CommandSeparator />
          <div className="p-2">
            {showCreate ? (
              <div className="flex items-center gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder={t`Project name`}
                  className="h-8 text-sm"
                  autoFocus
                />
                <Button
                  size="sm"
                  className="h-8 shrink-0 rounded-full"
                  onClick={handleCreate}
                  disabled={creating || !newName.trim()}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-sm"
                onClick={() => setShowCreate(true)}
              >
                <FolderPlus className="h-4 w-4" />
                <Trans>Create new project</Trans>
              </Button>
            )}
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
