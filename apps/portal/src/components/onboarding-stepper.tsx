import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useNavigate } from "@tanstack/react-router";
import { Check, CircleDot, Rocket } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useCreateEnvironment } from "@/hooks/use-environments";
import { useCreateProject } from "@/hooks/use-projects";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/stores/project-store";

interface StepState {
  projectCreated: boolean;
  environmentCreated: boolean;
}

export const OnboardingStepper = () => {
  const { selectedProjectId, setSelectedProjectId } = useProjectStore();
  const createProject = useCreateProject();
  const createEnvironment = useCreateEnvironment();
  const navigate = useNavigate();

  const [stepState, setStepState] = useState<StepState>({
    projectCreated: false,
    environmentCreated: false,
  });
  const [projectName, setProjectName] = useState("");
  const [envName, setEnvName] = useState("");

  const handleCreateProject = () => {
    if (!projectName.trim()) return;
    createProject.mutate(projectName, {
      onSuccess: (newId) => {
        setSelectedProjectId(newId);
        setStepState((prev) => ({ ...prev, projectCreated: true }));
        setProjectName("");
        toast.success(t`Project created successfully!`);
      },
      onError: () => {
        toast.error(t`Failed to create project`);
      },
    });
  };

  const handleCreateEnv = () => {
    if (!envName.trim() || !selectedProjectId) return;
    createEnvironment.mutate(
      { projectId: selectedProjectId, name: envName, allowedDomains: [] },
      {
        onSuccess: () => {
          setStepState((prev) => ({ ...prev, environmentCreated: true }));
          setEnvName("");
          toast.success(t`Environment created!`);
        },
        onError: () => {
          toast.error(t`Failed to create environment`);
        },
      },
    );
  };

  const currentStep = !stepState.projectCreated
    ? 0
    : !stepState.environmentCreated
      ? 1
      : 2;

  const steps = [
    {
      title: <Trans>Create your first project</Trans>,
      description: (
        <Trans>Projects group environments and configurations together.</Trans>
      ),
    },
    {
      title: <Trans>Add an environment</Trans>,
      description: (
        <Trans>
          Environments define deployment targets like production or staging.
        </Trans>
      ),
    },
    {
      title: <Trans>You're all set!</Trans>,
      description: (
        <Trans>
          Start configuring your environments with secrets and settings.
        </Trans>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-lg py-12">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          <Trans>Welcome to Config Portal</Trans>
        </h1>
        <p className="mt-2 text-[var(--muted-foreground)]">
          <Trans>Let's get you set up in a few quick steps.</Trans>
        </p>
      </div>

      <div className="space-y-0">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isCurrent = idx === currentStep;

          return (
            <div key={idx} className="relative flex gap-4">
              {/* Vertical line */}
              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    "absolute left-[15px] top-[32px] h-[calc(100%-16px)] w-[2px]",
                    isCompleted ? "bg-emerald-500" : "bg-border",
                    isCurrent && "bg-border",
                  )}
                />
              )}

              {/* Step circle */}
              <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center bg-background">
                {isCompleted ? (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <Check className="h-4 w-4" />
                  </div>
                ) : isCurrent ? (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#5683da] bg-background">
                    <CircleDot className="h-4 w-4 text-[#5683da]" />
                  </div>
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30 bg-background">
                    <span className="text-xs text-muted-foreground">
                      {idx + 1}
                    </span>
                  </div>
                )}
              </div>

              {/* Step content */}
              <div className="flex-1 pb-8">
                <h3
                  className={cn(
                    "text-sm font-semibold",
                    isCompleted && "text-emerald-600 dark:text-emerald-400",
                    isCurrent && "text-foreground",
                    !isCompleted && !isCurrent && "text-muted-foreground",
                  )}
                >
                  {step.title}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {step.description}
                </p>

                {/* Step 1: Create project form */}
                {idx === 0 && isCurrent && (
                  <div className="mt-3 flex items-center gap-2">
                    <Input
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleCreateProject()
                      }
                      placeholder={t`Project name`}
                      className="h-9 text-sm"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      className="h-9 w-20 shrink-0 rounded-full"
                      onClick={handleCreateProject}
                      disabled={createProject.isPending || !projectName.trim()}
                    >
                      {createProject.isPending ? (
                        <Spinner />
                      ) : (
                        <Trans>Create</Trans>
                      )}
                    </Button>
                  </div>
                )}

                {/* Step 2: Create environment form */}
                {idx === 1 && isCurrent && (
                  <div className="mt-3 flex items-center gap-2">
                    <Input
                      value={envName}
                      onChange={(e) => setEnvName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreateEnv()}
                      placeholder={t`e.g. production, staging`}
                      className="h-9 text-sm"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      className="h-9 w-20 shrink-0 rounded-full"
                      onClick={handleCreateEnv}
                      disabled={createEnvironment.isPending || !envName.trim()}
                    >
                      {createEnvironment.isPending ? (
                        <Spinner />
                      ) : (
                        <Trans>Create</Trans>
                      )}
                    </Button>
                  </div>
                )}

                {/* Step 3: Done */}
                {idx === 2 && isCurrent && (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      className="gap-2 rounded-full"
                      onClick={() => navigate({ to: "/environments" })}
                    >
                      <Rocket className="h-4 w-4" />
                      <Trans>Go to Environments</Trans>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
