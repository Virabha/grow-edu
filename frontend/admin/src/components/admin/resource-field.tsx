"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "select"
  | "colour"
  | "password"
  | "date"
  | "image";

export interface FieldSpec {
  key: string;
  label: string;
  type: FieldType;
  help?: string;
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  /** Hide the field from the create/edit form (list-only column). */
  formHidden?: boolean;
}

export type FieldValue = string | number | boolean | null | undefined;

/**
 * One labelled control, chosen by `type`.
 *
 * Both the CRUD screens and the settings screens render their forms from field
 * specs, so the whole admin area picks up a fix here at once.
 */
export function ResourceField({
  field,
  value,
  onChange,
  error,
}: {
  field: FieldSpec;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
  error?: string;
}) {
  const id = `field-${field.key}`;
  const describedBy = error ? `${id}-error` : field.help ? `${id}-help` : undefined;

  if (field.type === "boolean") {
    return (
      <div className="flex items-start justify-between gap-4 rounded-lg border border-border px-3 py-2.5">
        <div className="min-w-0">
          <Label htmlFor={id} className="text-sm font-medium">
            {field.label}
          </Label>
          {field.help && (
            <p id={`${id}-help`} className="mt-0.5 text-xs text-muted-foreground">
              {field.help}
            </p>
          )}
        </div>
        <Switch
          id={id}
          checked={value === true || value === "true"}
          onCheckedChange={(next) => onChange(next)}
          aria-describedby={describedBy}
        />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {field.label}
        {/* Hidden from the accessible name — otherwise the field announces as
            "Name star". Required-ness is carried by aria-required instead. */}
        {field.required && (
          <span aria-hidden="true" className="ml-0.5 text-destructive">
            *
          </span>
        )}
      </Label>

      {field.type === "textarea" ? (
        <Textarea
          id={id}
          rows={4}
          value={String(value ?? "")}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-required={field.required || undefined}
          aria-describedby={describedBy}
        />
      ) : field.type === "select" ? (
        <Select
          value={String(value ?? "")}
          onValueChange={(next) => onChange(next)}
        >
          <SelectTrigger
            id={id}
            aria-required={field.required || undefined}
            aria-describedby={describedBy}
          >
            <SelectValue placeholder={field.placeholder ?? "Choose one"} />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : field.type === "colour" ? (
        <div className="flex items-center gap-2">
          <input
            id={id}
            type="color"
            value={String(value ?? "#000000")}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent p-1"
            aria-describedby={describedBy}
          />
          <Input
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            className="font-mono text-sm"
            aria-label={`${field.label} hex value`}
          />
        </div>
      ) : (
        <Input
          id={id}
          type={
            field.type === "number"
              ? "number"
              : field.type === "password"
                ? "password"
                : field.type === "date"
                  ? "date"
                  : "text"
          }
          value={value === null || value === undefined ? "" : String(value)}
          placeholder={field.placeholder}
          onChange={(e) =>
            onChange(
              field.type === "number"
                ? e.target.value === ""
                  ? ""
                  : Number(e.target.value)
                : e.target.value,
            )
          }
          aria-invalid={!!error}
          aria-required={field.required || undefined}
          aria-describedby={describedBy}
        />
      )}

      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : field.help ? (
        <p id={`${id}-help`} className="text-xs text-muted-foreground">
          {field.help}
        </p>
      ) : null}
    </div>
  );
}
