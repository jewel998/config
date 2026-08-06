import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { AlertTriangle, Bell, Plus } from "lucide-react";
import { useState } from "react";

import { WebhookCard } from "@/components/webhook-card";
import { WebhookFormModal } from "@/components/webhook-form-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRBAC } from "@/hooks/use-rbac";
import { useWebhooks } from "@/hooks/use-webhooks";
import {
  useCreateWebhook,
  useUpdateWebhook,
  useDeleteWebhook,
} from "@/hooks/use-webhook-mutations";
import type { WebhookConfig } from "@/types/webhook";

interface WebhookSettingsProps {
  projectId: string;
}

export const WebhookSettings = ({ projectId }: WebhookSettingsProps) => {
  const { isAdmin } = useRBAC();
  const { data: webhooks = [], isLoading } = useWebhooks(projectId);
  const createWebhook = useCreateWebhook();
  const updateWebhook = useUpdateWebhook();
  const deleteWebhook = useDeleteWebhook();

  const [showForm, setShowForm] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(
    null,
  );
  const [deletingWebhook, setDeletingWebhook] = useState<WebhookConfig | null>(
    null,
  );

  const handleCreate = (
    data: Parameters<typeof createWebhook.mutate>[0] extends infer T
      ? Omit<T, "projectId">
      : never,
  ) => {
    createWebhook.mutate({ projectId, ...data });
  };

  const handleUpdate = (
    data: Parameters<typeof createWebhook.mutate>[0] extends infer T
      ? Omit<T, "projectId">
      : never,
  ) => {
    if (!editingWebhook) return;
    updateWebhook.mutate({ projectId, webhookId: editingWebhook.id, data });
    setEditingWebhook(null);
  };

  const handleDelete = () => {
    if (!deletingWebhook) return;
    deleteWebhook.mutate({ projectId, webhookId: deletingWebhook.id });
    setDeletingWebhook(null);
  };

  return (
    <>
      <Card className="rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            <Trans>Webhooks</Trans>
          </CardTitle>
          {isAdmin && (
            <Button
              size="sm"
              className="rounded-full gap-1"
              onClick={() => setShowForm(true)}
              disabled={webhooks.length >= 10}
            >
              <Plus className="h-3.5 w-3.5" />
              <Trans>Add</Trans>
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              <Trans>Loading...</Trans>
            </p>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <Bell className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                <Trans>No webhooks configured</Trans>
              </p>
              {isAdmin && (
                <p className="text-xs text-muted-foreground">
                  <Trans>
                    Add a webhook to receive notifications when configs change.
                  </Trans>
                </p>
              )}
            </div>
          ) : (
            webhooks.map((wh) => (
              <WebhookCard
                key={wh.id}
                webhook={wh}
                projectId={projectId}
                isAdmin={isAdmin}
                onEdit={() => setEditingWebhook(wh)}
                onDelete={() => setDeletingWebhook(wh)}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <WebhookFormModal
        open={showForm}
        onOpenChange={setShowForm}
        projectId={projectId}
        onSubmit={handleCreate}
      />

      {/* Edit Modal */}
      {editingWebhook && (
        <WebhookFormModal
          open={!!editingWebhook}
          onOpenChange={(open) => !open && setEditingWebhook(null)}
          projectId={projectId}
          editingWebhook={editingWebhook}
          onSubmit={handleUpdate}
        />
      )}

      {/* Delete Confirmation */}
      <Dialog
        open={!!deletingWebhook}
        onOpenChange={(open) => !open && setDeletingWebhook(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <Trans>Delete webhook?</Trans>
            </DialogTitle>
            <DialogDescription>
              <Trans>
                Delete "{deletingWebhook?.name}"? This will also remove all
                delivery history.
              </Trans>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              className="rounded-full"
              onClick={() => setDeletingWebhook(null)}
            >
              <Trans>Cancel</Trans>
            </Button>
            <Button
              variant="destructive"
              className="rounded-full"
              onClick={handleDelete}
            >
              <Trans>Delete</Trans>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
