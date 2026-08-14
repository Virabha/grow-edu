"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectContextValue {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  labels: Map<string, string>;
  listId: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelectContext() {
  const ctx = React.useContext(SelectContext);
  if (!ctx) throw new Error("Select components must be used within Select");
  return ctx;
}

/** Flatten an item's children down to the plain text used as its label. */
function textOf(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    return textOf(props.children);
  }
  return "";
}

/**
 * Walk the tree once per render to map each item's value to its label, so the
 * trigger can show "All orders" rather than the raw "all". Items only exist in
 * the DOM while the list is open, so they cannot register themselves.
 */
function collectLabels(
  node: React.ReactNode,
  out: Map<string, string>,
): Map<string, string> {
  React.Children.forEach(node, (child) => {
    if (!React.isValidElement(child)) return;
    const props = child.props as {
      value?: string;
      children?: React.ReactNode;
    };
    if (child.type === SelectItem && typeof props.value === "string") {
      out.set(props.value, textOf(props.children));
    }
    if (props.children) collectLabels(props.children, out);
  });
  return out;
}

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

function Select({ value = "", onValueChange, children }: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const listId = React.useId();
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const labels = collectLabels(children, new Map<string, string>());

  return (
    <SelectContext.Provider
      value={{
        value,
        onValueChange: onValueChange ?? (() => {}),
        open,
        setOpen,
        labels,
        listId,
        triggerRef,
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
  const { setOpen, open, listId, triggerRef } = useSelectContext();
  return (
    <button
      ref={triggerRef}
      type="button"
      role="combobox"
      aria-expanded={open}
      aria-haspopup="listbox"
      aria-controls={listId}
      className={cn(
        "flex h-9 w-full items-center justify-between gap-2 whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
        className,
      )}
      onClick={() => setOpen(!open)}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setOpen(true);
        }
      }}
      {...props}
    >
      {children}
      <ChevronDown
        aria-hidden="true"
        className={cn(
          "size-3.5 shrink-0 text-muted-foreground transition-transform",
          open && "rotate-180",
        )}
      />
    </button>
  );
}

function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value, labels } = useSelectContext();
  const label = labels.get(value);
  return <span>{label || value || placeholder}</span>;
}

function SelectContent({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const { open, setOpen, listId, triggerRef } = useSelectContext();
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (!ref.current) return;
      const items = Array.from(
        ref.current.querySelectorAll<HTMLElement>('[role="option"]'),
      );
      if (items.length === 0) return;
      const index = items.indexOf(document.activeElement as HTMLElement);

      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        items[Math.min(items.length - 1, index + 1)]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (index <= 0) {
          setOpen(false);
          triggerRef.current?.focus();
        } else {
          items[index - 1]?.focus();
        }
      } else if (e.key === "Home") {
        e.preventDefault();
        items[0]?.focus();
      } else if (e.key === "End") {
        e.preventDefault();
        items[items.length - 1]?.focus();
      } else if (e.key === "Tab") {
        setOpen(false);
      }
    }

    // Land on the selected option so arrow keys continue from there.
    const selected =
      ref.current?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]') ??
      ref.current?.querySelector<HTMLElement>('[role="option"]');
    selected?.focus();

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, setOpen, triggerRef]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      id={listId}
      role="listbox"
      className={cn(
        "absolute top-full z-50 mt-1 max-h-96 min-w-[8rem] overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md",
        className,
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
}: Omit<React.ComponentProps<"button">, "value"> & { value: string }) {
  const {
    onValueChange,
    setOpen,
    value: selectedValue,
    triggerRef,
  } = useSelectContext();
  const selected = selectedValue === value;

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      className={cn(
        "relative flex w-full cursor-default select-none items-center gap-2 rounded-sm py-1.5 pl-2 pr-8 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        className,
      )}
      onClick={() => {
        onValueChange(value);
        setOpen(false);
        triggerRef.current?.focus();
      }}
      {...props}
    >
      <Check
        aria-hidden="true"
        className={cn("size-3.5 shrink-0", selected ? "opacity-100" : "opacity-0")}
      />
      <span className="flex-1">{children}</span>
    </button>
  );
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
