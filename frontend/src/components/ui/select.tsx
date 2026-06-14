"use client";

import { Select } from "@base-ui/react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

interface AppSelectProps {
  value?: string | null;
  onValueChange?: (value: string | null) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  name?: string;
}

export function AppSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  label,
  error,
  disabled,
  className,
  name,
}: AppSelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-slate-700">{label}</label>
      )}
      <Select.Root
        value={value}
        onValueChange={(val) => onValueChange?.(val)}
        disabled={disabled}
        name={name}
      >
        <Select.Trigger
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-slate-300",
            "bg-white px-3 py-2 text-sm",
            "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-400 focus:ring-red-400",
            className
          )}
        >
          <Select.Value placeholder={placeholder} />
          <Select.Icon>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </Select.Icon>
        </Select.Trigger>

        <Select.Portal>
          <Select.Positioner sideOffset={4} style={{ zIndex: 9999 }}>
            <Select.Popup
              className={cn(
                "min-w-[var(--anchor-width)] overflow-hidden rounded-lg border border-slate-200",
                "bg-white shadow-lg py-1",
                "origin-[var(--transform-origin)]",
                "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
                "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
                "transition-[opacity,transform] duration-100"
              )}
            >
              <Select.List>
                {options.map((opt) => (
                  <Select.Item
                    key={opt.value}
                    value={opt.value}
                    className={cn(
                      "flex items-center justify-between gap-2 px-3 py-2 text-sm cursor-pointer",
                      "text-slate-700 outline-none",
                      "data-[highlighted]:bg-indigo-50 data-[highlighted]:text-indigo-900"
                    )}
                  >
                    <Select.ItemText>{opt.label}</Select.ItemText>
                    <Select.ItemIndicator>
                      <Check className="h-4 w-4 text-indigo-600" />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
