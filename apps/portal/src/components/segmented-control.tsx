import { Button } from "@/components/ui/button";

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: React.ReactNode }>;
  size?: "sm" | "default";
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = "default",
}: SegmentedControlProps<T>) {
  const isSmall = size === "sm";

  return (
    <div className="flex gap-1 rounded-full border p-1 w-fit">
      {options.map((option) => (
        <Button
          key={option.value}
          variant={value === option.value ? "default" : "ghost"}
          className={`rounded-full h-auto ${isSmall ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm"}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
