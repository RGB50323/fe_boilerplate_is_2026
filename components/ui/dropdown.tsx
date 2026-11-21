"use client";

import { useEffect, useRef, useState } from "react";
import {
  Select,
  SelectItem,
  SelectLabel,
  SelectPopover,
  SelectProvider,
} from "@ariakit/react";

type Opcion = { value: string | number; label: string };

type DropdownProps = {
  id: string;
  label: string;
  opciones: Opcion[];
  placeholder?: string;
  labelClassName?: string;
  className?: string;
  name?: string;
  disabled?: boolean;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (value: string) => void;
};

export function Dropdown({
  id,
  label,
  opciones,
  placeholder,
  labelClassName = "text-base text-zinc-400",
  className = "",
  name,
  disabled,
  value,
  defaultValue,
  onChange,
}: DropdownProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [localValue, setLocalValue] = useState(() =>
    String(defaultValue ?? (placeholder !== undefined ? "" : opciones[0]?.value ?? "")),
  );

  const selectedValue = value === undefined ? localValue : String(value);
  const selectedLabel = opciones.find(
    (opcion) => String(opcion.value) === selectedValue,
  )?.label;

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideScroll(event: Event) {
      if (event instanceof WheelEvent && event.ctrlKey) return;

      if (event.target instanceof Node && rootRef.current?.contains(event.target)) {
        return;
      }

      setOpen(false);
    }

    window.addEventListener("wheel", closeOnOutsideScroll, {
      capture: true,
      passive: true,
    });
    window.addEventListener("scroll", closeOnOutsideScroll, true);

    return () => {
      window.removeEventListener("wheel", closeOnOutsideScroll, true);
      window.removeEventListener("scroll", closeOnOutsideScroll, true);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="flex items-center gap-3">
      <SelectProvider
        open={open}
        setOpen={setOpen}
        value={selectedValue}
        setValue={(nextValue) => {
          if (value === undefined) setLocalValue(nextValue);
          onChange?.(nextValue);
        }}
      >
        <SelectLabel className={labelClassName}>{label}</SelectLabel>

        <Select
          id={id}
          disabled={disabled}
          className={`flex min-w-44 cursor-pointer items-center justify-between gap-3 rounded-lg border border-zinc-700 bg-[#262626] px-4 py-2.5 text-zinc-100 focus-visible:outline-2 focus-visible:outline-orange-400 disabled:opacity-60 ${className}`}
        >
          {selectedLabel ?? placeholder ?? "Seleccionar"}
          <span aria-hidden="true">▾</span>
        </Select>

        <SelectPopover
          portal={false}
          modal={false}
          preventBodyScroll={false}
          sameWidth
          gutter={4}
          className="z-50 max-h-56 overflow-y-auto overscroll-contain rounded-lg border border-zinc-700 bg-[#262626] p-1 text-zinc-100 shadow-lg"
        >
          {placeholder !== undefined && (
            <SelectItem value="" className="cursor-pointer rounded px-3 py-2 data-active-item:bg-zinc-700">
              {placeholder}
            </SelectItem>
          )}

          {opciones.map((opcion) => (
            <SelectItem
              key={opcion.value}
              value={String(opcion.value)}
              className="cursor-pointer rounded px-3 py-2 data-active-item:bg-zinc-700"
            >
              {opcion.label}
            </SelectItem>
          ))}
        </SelectPopover>

        {name && (
          <input type="hidden" name={name} value={selectedValue} disabled={disabled} />
        )}
      </SelectProvider>
    </div>
  );
}