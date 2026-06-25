import { type ReactElement } from "react";
import { cn } from "@/lib/utils";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  size?: "sm" | "md";
  disabled?: boolean;
}

const SIZES = {
  sm: { track: "h-5 w-9", thumb: "size-4", translate: "translate-x-4" },
  md: { track: "h-6 w-11", thumb: "size-5", translate: "translate-x-5" },
};

export function ToggleSwitch({
  checked,
  onChange,
  size = "md",
  disabled = false,
}: ToggleSwitchProps): ReactElement {
  const s = SIZES[size];
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        "relative inline-flex rounded-full border-2 border-transparent p-0 shrink-0",
        "transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent-amber/30",
        s.track,
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
        disabled
          ? "bg-canvas-elevated"
          : checked
            ? "bg-accent-amber"
            : "bg-canvas-surface border border-bdr",
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block rounded-full shadow-sm",
          "transform transition-transform duration-200",
          s.thumb,
          disabled ? "bg-ink-muted" : "bg-ink-pri",
          checked ? s.translate : "translate-x-0",
        )}
      />
    </button>
  );
}
