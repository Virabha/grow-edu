"use client";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface DynamicListProps {
  label: string;
  placeholder: string;
  items: string[];
  onChange: (items: string[]) => void;
  className?: string;
  /** Optional helper text under the label. */
  hint?: string;
}

export function DynamicList({
  label,
  placeholder,
  items,
  onChange,
  className,
  hint,
}: DynamicListProps) {
  const list = items.length > 0 ? items : [""];

  const set = (next: string[]) => onChange(next);
  const add = () => set([...list, ""]);
  const remove = (i: number) => set(list.filter((_, idx) => idx !== i));
  const change = (i: number, v: string) =>
    set(list.map((item, idx) => (idx === i ? v : item)));

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <div className="space-y-2">
        {list.map((item, i) => (
          <div key={i} className="group flex gap-2">
            <Input
              value={item}
              onChange={(e) => change(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && list[i]?.trim() && i === list.length - 1) {
                  e.preventDefault();
                  add();
                }
              }}
              placeholder={placeholder}
              autoFocus={i === list.length - 1 && i > 0}
            />
            {list.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(i)}
                aria-label="Remove"
                className="shrink-0 text-muted-foreground transition-opacity hover:text-destructive sm:opacity-0 group-hover:opacity-100"
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        className="gap-1.5 border-dashed text-primary"
      >
        <Plus className="size-3.5" />
        Add another
      </Button>
    </div>
  );
}
