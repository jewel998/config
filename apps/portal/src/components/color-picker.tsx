import { Trans } from "@lingui/react/macro";

import { Button } from "@/components/ui/button";
import { ENV_COLOR_PRESETS } from "@/lib/constants";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export const ColorPicker = ({ value, onChange }: ColorPickerProps) => (
  <div className="space-y-1">
    <p className="text-xs font-medium text-muted-foreground">
      <Trans>Color</Trans>
    </p>
    <div className="flex gap-2">
      {ENV_COLOR_PRESETS.map((color) => (
        <Button
          key={color}
          type="button"
          variant="ghost"
          className={`h-6 w-6 rounded-full p-0 border-2 transition-all ${
            value === color
              ? "border-foreground scale-110"
              : "border-transparent"
          }`}
          style={{ backgroundColor: color }}
          onClick={() => onChange(color)}
          aria-label={color}
        />
      ))}
    </div>
  </div>
);
