import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Plus, Trash2, Users, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConditionSummary } from "@/components/condition-summary";
import { ResponsiveModal } from "@/components/responsive-modal";
import { SegmentEditModal } from "@/components/segment-edit-modal";
import { UsageIndicator } from "@/components/usage-indicator";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Segment, PredicateGroup } from "@/lib/types";

interface SegmentManagerProps {
  segments: Segment[];
  projectId: string;
  environmentId: string;
  onCreateSegment: (segment: {
    name: string;
    description: string;
    conditions: PredicateGroup[];
  }) => void;
  onUpdateSegment?: (
    segmentId: string,
    data: { name: string; description: string; conditions: PredicateGroup[] },
  ) => void;
  onDeleteSegment: (segmentId: string) => void;
  disabled?: boolean;
}

export const SegmentManager = ({
  segments,
  projectId,
  environmentId,
  onCreateSegment,
  onUpdateSegment,
  onDeleteSegment,
  disabled,
}: SegmentManagerProps) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null);
  const [deletingSegment, setDeletingSegment] = useState<Segment | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreateSegment({
      name: name.trim(),
      description: description.trim(),
      conditions: [],
    });
    setName("");
    setDescription("");
    setShowCreateModal(false);
  };

  const handleDeleteConfirm = () => {
    if (deletingSegment) {
      onDeleteSegment(deletingSegment.id);
      setDeletingSegment(null);
    }
  };

  return (
    <>
      <Card className="rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            <Trans>Segments</Trans>
          </CardTitle>
          {!disabled && (
            <Button
              size="sm"
              className="rounded-full gap-1"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              <Trans>New</Trans>
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {segments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              <Trans>No segments defined.</Trans>
            </p>
          )}
          {segments.map((seg) => (
            <div
              key={seg.id}
              className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => !disabled && setEditingSegment(seg)}
              role={!disabled ? "button" : undefined}
              tabIndex={!disabled ? 0 : undefined}
              onKeyDown={(e) => {
                if (!disabled && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  setEditingSegment(seg);
                }
              }}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{seg.name}</p>
                {seg.description && (
                  <p className="text-xs text-muted-foreground truncate">
                    {seg.description}
                  </p>
                )}
                <div className="mt-1">
                  <ConditionSummary conditions={seg.conditions} />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <UsageIndicator
                    segmentId={seg.id}
                    projectId={projectId}
                    environmentId={environmentId}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(seg.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              {!disabled && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingSegment(seg);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <ResponsiveModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        title={<Trans>Create Segment</Trans>}
        description={
          <Trans>Define a reusable audience group for targeting rules.</Trans>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              <Trans>Name</Trans>
            </label>
            <Input
              placeholder={t`Segment name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              <Trans>Description</Trans>
            </label>
            <Textarea
              placeholder={t`What does this segment represent?`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              className="min-h-20 text-sm"
            />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button
              className="min-w-20 rounded-full"
              onClick={handleCreate}
              disabled={!name.trim()}
            >
              <Trans>Create</Trans>
            </Button>
            <Button
              variant="ghost"
              className="rounded-full"
              onClick={() => setShowCreateModal(false)}
            >
              <Trans>Cancel</Trans>
            </Button>
          </div>
        </div>
      </ResponsiveModal>

      {/* Edit Modal */}
      {editingSegment && (
        <SegmentEditModal
          segment={editingSegment}
          open={!!editingSegment}
          onOpenChange={(open) => !open && setEditingSegment(null)}
          onSave={(data) => {
            onUpdateSegment?.(editingSegment.id, data);
            setEditingSegment(null);
          }}
          disabled={disabled}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deletingSegment}
        onOpenChange={(open) => !open && setDeletingSegment(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <Trans>Delete segment?</Trans>
            </DialogTitle>
            <DialogDescription>
              <Trans>
                Are you sure you want to delete "{deletingSegment?.name}"? This
                action cannot be undone.
              </Trans>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              className="rounded-full"
              onClick={() => setDeletingSegment(null)}
            >
              <Trans>Cancel</Trans>
            </Button>
            <Button
              variant="destructive"
              className="rounded-full"
              onClick={handleDeleteConfirm}
            >
              <Trans>Delete</Trans>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
