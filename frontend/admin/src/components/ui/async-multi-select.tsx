"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useDebounce } from "@/hooks/use-debounce";

export interface AsyncMultiSelectOption {
  /** Stable identifier (used internally, as the "selected" key). */
  value: string;
  /** Primary line shown in the dropdown + the chip. */
  label: string;
  /** Optional second line shown in the dropdown only. */
  secondary?: string;
  /** Arbitrary payload — handy for callers that want richer data later. */
  meta?: Record<string, unknown>;
}

interface Props {
  /** Currently-selected options (controlled). */
  value: AsyncMultiSelectOption[];
  onChange: (next: AsyncMultiSelectOption[]) => void;
  /**
   * Called with the debounced search query (or empty string for the initial
   * "show recent" list). Returns the matching options.
   */
  loadOptions: (query: string) => Promise<AsyncMultiSelectOption[]>;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  /** Optional ability to add a raw value not in the result list — e.g. emails. */
  allowAdHoc?: (query: string) => AsyncMultiSelectOption | null;
  className?: string;
}

export function AsyncMultiSelect({
  value,
  onChange,
  loadOptions,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyMessage = "No results.",
  allowAdHoc,
  className,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const debounced = useDebounce(query, 250);
  const [results, setResults] = React.useState<AsyncMultiSelectOption[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    loadOptions(debounced)
      .then((r) => {
        if (!cancelled) setResults(r);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, debounced, loadOptions]);

  const selectedKeys = React.useMemo(
    () => new Set(value.map((o) => o.value)),
    [value],
  );

  function toggle(opt: AsyncMultiSelectOption) {
    if (selectedKeys.has(opt.value)) {
      onChange(value.filter((o) => o.value !== opt.value));
    } else {
      onChange([...value, opt]);
    }
  }

  function removeAt(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  const adHoc = allowAdHoc && query.trim() ? allowAdHoc(query.trim()) : null;
  const adHocAlreadyListed =
    adHoc &&
    (selectedKeys.has(adHoc.value) ||
      results.some((r) => r.value === adHoc.value));

  return (
    <div className={cn("space-y-1.5", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-8 w-full justify-between px-2.5 text-xs font-normal"
          >
            <span
              className={cn(
                "truncate",
                value.length === 0 && "text-muted-foreground",
              )}
            >
              {value.length === 0
                ? placeholder
                : `${value.length} selected`}
            </span>
            <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={searchPlaceholder}
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              {loading && (
                <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  Searching…
                </div>
              )}
              {!loading && results.length === 0 && !adHoc && (
                <CommandEmpty>{emptyMessage}</CommandEmpty>
              )}
              {!loading && adHoc && !adHocAlreadyListed && (
                <CommandGroup heading="Add new">
                  <CommandItem
                    value={adHoc.value}
                    onSelect={() => {
                      toggle(adHoc);
                      setQuery("");
                    }}
                  >
                    <span className="flex-1 truncate">{adHoc.label}</span>
                    <span className="ml-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                      Use this
                    </span>
                  </CommandItem>
                </CommandGroup>
              )}
              {!loading && results.length > 0 && (
                <CommandGroup>
                  {results.map((opt) => {
                    const selected = selectedKeys.has(opt.value);
                    return (
                      <CommandItem
                        key={opt.value}
                        value={opt.value}
                        onSelect={() => toggle(opt)}
                      >
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate">{opt.label}</span>
                          {opt.secondary && (
                            <span className="truncate text-[11px] text-muted-foreground">
                              {opt.secondary}
                            </span>
                          )}
                        </div>
                        <Check
                          className={cn(
                            "ml-2 size-3.5 shrink-0",
                            selected ? "opacity-100" : "opacity-0",
                          )}
                        />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((opt, idx) => (
            <span
              key={opt.value}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px]"
            >
              <span className="max-w-[160px] truncate">{opt.label}</span>
              <button
                type="button"
                onClick={() => removeAt(idx)}
                className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
                aria-label={`Remove ${opt.label}`}
              >
                <X className="size-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
