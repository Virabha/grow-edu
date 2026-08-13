"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SelectContextValue {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelectContext() {
  const ctx = React.useContext(SelectContext);
  if (!ctx) throw new Error("Select components must be used within Select");
  return ctx;
}

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

function Select({ value = "", onValueChange, children }: SelectProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <SelectContext.Provider
      value={{
        value,
        onValueChange: onValueChange ?? (() => {}),
        open,
        setOpen,
      }}
    >
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
}

function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<"button">) {
  const { setOpen, open } = useSelectContext();
  return (
    <button
      type="button"
      role="combobox"
      aria-expanded={open}
      className={cn(
        "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
        className
      )}
      onClick={() => setOpen(!open)}
      {...props}
    >
      {children}
    </button>
  );
}

function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value } = useSelectContext();
  return <span>{value || placeholder}</span>;
}

function SelectContent({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const { open, setOpen } = useSelectContext();
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, setOpen]);
  if (!open) return null;
  return (
    <div
      ref={ref}
      className={cn(
        "absolute top-full z-50 mt-1 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md",
        className
      )}
      {...props}
    >
      <div className="p-1">{children}</div>
    </div>
  );
}

function SelectItem({
  className,
  children,
  value,
  ...props
}: React.ComponentProps<"div"> & { value: string }) {
  const { onValueChange, setOpen } = useSelectContext();
  return (
    <div
      role="option"
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      onClick={() => {
        onValueChange(value);
        setOpen(false);
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
