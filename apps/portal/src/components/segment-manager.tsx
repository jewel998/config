import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Plus, Trash2, Users } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Segment, PredicateGroup } from "@/lib/types";

interface SegmentManagerProps {
  segments: Segment[];
  onCreateSegment: (segment: { name: string; description: string; conditions: PredicateGroup[] }) => void;
  onDeleteSegment: (segmentId: string) => void;
  disabled?: boolean;
}

export const SegmentManager = ({ segments, onCreateSegment, onDeleteSegment, disabled }: SegmentManagerProps) => {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreateSegment({ name: name.trim(), description: description.trim(), conditions: [] });
    setName("");
    setDescription("");
    setShowForm(false);
  };

  return (
    <Card className="rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" />
          <Trans>Segments</Trans>
        </CardTitle>
        {!disabled && <Button size="sm" className="rounded-full gap-1" onClick={() => setShowForm(true)}><Plus className="h-3.5 w-3.5" /><Trans>New</Trans></Button>}
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <div className="space-y-2 rounded-lg border p-3">
            <Input placeholder={t`Segment name`} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
            <Textarea placeholder={t`Description (optional)`} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} className="min-h-16 text-sm" />
            <div className="flex gap-2">
              <Button size="sm" className="rounded-full" onClick={handleCreate} disabled={!name.trim()}><Trans>Create</Trans></Button>
              <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setShowForm(false)}><Trans>Cancel</Trans></Button>
            </div>
          </div>
        )}
        {segments.length === 0 && !showForm && <p className="text-sm text-muted-foreground text-center py-4"><Trans>No segments defined.</Trans></p>}
        {segments.map((seg) => (
          <div key={seg.id} className="flex items-center justify-between rounded-lg border p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{seg.name}</p>
              {seg.description && <p className="text-xs text-muted-foreground truncate">{seg.description}</p>}
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-[10px]">{seg.conditions.length} groups</Badge>
                <span className="text-[10px] text-muted-foreground">{new Date(seg.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
            {!disabled && (
              <Button variant="ghost" size="icon-xs" onClick={() => onDeleteSegment(seg.id)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
