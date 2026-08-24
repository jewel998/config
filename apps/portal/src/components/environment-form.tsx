import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useState } from "react";

import { ColorPicker } from "@/components/color-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { DEFAULT_ENV_COLOR } from "@/lib/constants";

interface EnvironmentFormValues {
  name: string;
  allowedDomains: string[];
  color: string;
  isProduction: boolean;
}

interface EnvironmentFormProps {
  initialValues?: Partial<EnvironmentFormValues>;
  onSubmit: (values: EnvironmentFormValues) => void;
  onCancel: () => void;
  isPending: boolean;
  submitLabel?: React.ReactNode;
}

export const EnvironmentForm = ({
  initialValues,
  onSubmit,
  onCancel,
  isPending,
  submitLabel,
}: EnvironmentFormProps) => {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [domains, setDomains] = useState(initialValues?.allowedDomains?.join(", ") ?? "");
  const [color, setColor] = useState(initialValues?.color ?? DEFAULT_ENV_COLOR);
  const [isProduction, setIsProduction] = useState(initialValues?.isProduction ?? false);

  const handleSubmit = () => {
    if (!name.trim()) return;
    const parsedDomains = domains
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
    onSubmit({
      name: name.trim(),
      allowedDomains: parsedDomains,
      color,
      isProduction,
    });
  };

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <Input
        placeholder={t`Environment name`}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        placeholder={t`Allowed domains (comma-separated)`}
        value={domains}
        onChange={(e) => setDomains(e.target.value)}
      />
      <ColorPicker value={color} onChange={setColor} />
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={isProduction}
          onChange={(e) => setIsProduction(e.target.checked)}
          className="rounded"
        />
        <Trans>Production environment</Trans>
      </label>
      <div className="flex gap-2">
        <Button
          size="sm"
          className="rounded-full"
          onClick={handleSubmit}
          disabled={isPending || !name.trim()}
        >
          {isPending ? <Spinner /> : (submitLabel ?? <Trans>Save</Trans>)}
        </Button>
        <Button size="sm" variant="ghost" className="rounded-full" onClick={onCancel}>
          <Trans>Cancel</Trans>
        </Button>
      </div>
    </div>
  );
};
