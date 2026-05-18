"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight, X } from "lucide-react";
import type { FormSchema, FormSection, FormField, FormFieldType, FormFieldOption } from "../types";

const FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Phone" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown" },
  { value: "textarea", label: "Textarea" },
  { value: "radio", label: "Radio" },
  { value: "checkbox", label: "Checkbox" },
];

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function createEmptyField(): FormField {
  return {
    id: generateId(),
    name: "",
    label: "",
    type: "text",
    required: false,
    width: "full",
  };
}

function createEmptySection(): FormSection {
  return {
    id: generateId(),
    title: "New Section",
    fields: [createEmptyField()],
  };
}

function createDefaultSchema(): FormSchema {
  return {
    title: "Application Form",
    sections: [createEmptySection()],
  };
}

interface FormBuilderProps {
  value: FormSchema | null;
  onChange: (schema: FormSchema | null) => void;
}

export function FormBuilder({ value, onChange }: FormBuilderProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

  const isEnabled = value !== null;

  function toggleEnable() {
    if (isEnabled) {
      onChange(null);
    } else {
      const schema = createDefaultSchema();
      onChange(schema);
      setExpandedSections(new Set([schema.sections[0].id]));
    }
  }

  function updateSchema(updater: (schema: FormSchema) => FormSchema) {
    if (!value) return;
    onChange(updater(value));
  }

  function toggleSection(sectionId: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }

  function toggleField(fieldId: string) {
    setExpandedFields((prev) => {
      const next = new Set(prev);
      if (next.has(fieldId)) next.delete(fieldId);
      else next.add(fieldId);
      return next;
    });
  }

  function addSection() {
    const section = createEmptySection();
    updateSchema((s) => ({ ...s, sections: [...s.sections, section] }));
    setExpandedSections((prev) => new Set([...prev, section.id]));
  }

  function removeSection(sectionId: string) {
    updateSchema((s) => ({ ...s, sections: s.sections.filter((sec) => sec.id !== sectionId) }));
  }

  function updateSection(sectionId: string, updates: Partial<FormSection>) {
    updateSchema((s) => ({
      ...s,
      sections: s.sections.map((sec) => (sec.id === sectionId ? { ...sec, ...updates } : sec)),
    }));
  }

  function addField(sectionId: string) {
    const field = createEmptyField();
    updateSchema((s) => ({
      ...s,
      sections: s.sections.map((sec) =>
        sec.id === sectionId ? { ...sec, fields: [...sec.fields, field] } : sec
      ),
    }));
    setExpandedFields((prev) => new Set([...prev, field.id]));
  }

  function removeField(sectionId: string, fieldId: string) {
    updateSchema((s) => ({
      ...s,
      sections: s.sections.map((sec) =>
        sec.id === sectionId ? { ...sec, fields: sec.fields.filter((f) => f.id !== fieldId) } : sec
      ),
    }));
  }

  function updateField(sectionId: string, fieldId: string, updates: Partial<FormField>) {
    updateSchema((s) => ({
      ...s,
      sections: s.sections.map((sec) =>
        sec.id === sectionId
          ? { ...sec, fields: sec.fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)) }
          : sec
      ),
    }));
  }

  function updateFieldOptions(sectionId: string, fieldId: string, options: FormFieldOption[]) {
    updateField(sectionId, fieldId, { options });
  }

  return (
    <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Custom Application Form</span>
        <Switch checked={isEnabled} onCheckedChange={toggleEnable} />
      </div>

      {isEnabled && value && (
        <div className="space-y-3">
          <Input
            value={value.title}
            onChange={(e) => updateSchema((s) => ({ ...s, title: e.target.value }))}
            placeholder="Form title"
            className="text-sm"
          />
          <Input
            value={value.description ?? ""}
            onChange={(e) => updateSchema((s) => ({ ...s, description: e.target.value || undefined }))}
            placeholder="Form description (optional)"
            className="text-sm"
          />

          {value.sections.map((section) => (
            <Card key={section.id} className="border-dashed">
              <CardHeader className="px-3 py-2 cursor-pointer" onClick={() => toggleSection(section.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {expandedSections.has(section.id) ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                    <CardTitle className="text-sm">{section.title || "Untitled Section"}</CardTitle>
                    <span className="text-xs text-muted-foreground">({section.fields.length} fields)</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => { e.stopPropagation(); removeSection(section.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardHeader>

              {expandedSections.has(section.id) && (
                <CardContent className="px-3 pb-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Section Title</Label>
                      <Input
                        value={section.title}
                        onChange={(e) => updateSection(section.id, { title: e.target.value })}
                        className="text-sm h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Description</Label>
                      <Input
                        value={section.description ?? ""}
                        onChange={(e) => updateSection(section.id, { description: e.target.value || undefined })}
                        className="text-sm h-8"
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    {section.fields.map((field) => (
                      <FieldEditor
                        key={field.id}
                        field={field}
                        isExpanded={expandedFields.has(field.id)}
                        onToggle={() => toggleField(field.id)}
                        onUpdate={(updates) => updateField(section.id, field.id, updates)}
                        onUpdateOptions={(opts) => updateFieldOptions(section.id, field.id, opts)}
                        onRemove={() => removeField(section.id, field.id)}
                      />
                    ))}
                  </div>

                  <Button type="button" variant="outline" size="sm" className="w-full text-xs" onClick={() => addField(section.id)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Field
                  </Button>
                </CardContent>
              )}
            </Card>
          ))}

          <Button type="button" variant="outline" size="sm" className="w-full" onClick={addSection}>
            <Plus className="h-4 w-4 mr-1" /> Add Section
          </Button>
        </div>
      )}
    </div>
  );
}

function FieldEditor({
  field,
  isExpanded,
  onToggle,
  onUpdate,
  onUpdateOptions,
  onRemove,
}: {
  field: FormField;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<FormField>) => void;
  onUpdateOptions: (options: FormFieldOption[]) => void;
  onRemove: () => void;
}) {
  const needsOptions = field.type === "select" || field.type === "radio";

  return (
    <div className="rounded border bg-background p-2 space-y-2">
      <div className="flex items-center gap-2 cursor-pointer" onClick={onToggle}>
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        {isExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
        <span className="text-xs font-medium flex-1 truncate">{field.label || "Untitled field"}</span>
        <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">{field.type}</span>
        {field.required && <span className="text-[10px] text-red-500">*</span>}
        <Button type="button" variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
          <X className="h-3 w-3 text-destructive" />
        </Button>
      </div>

      {isExpanded && (
        <div className="space-y-2 pl-6">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Label</Label>
              <Input value={field.label} onChange={(e) => {
                const label = e.target.value;
                const name = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
                onUpdate({ label, name });
              }} className="text-xs h-7" />
            </div>
            <div>
              <Label className="text-xs">Field Name</Label>
              <Input value={field.name} onChange={(e) => onUpdate({ name: e.target.value })} className="text-xs h-7" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={field.type} onValueChange={(v) => onUpdate({ type: v as FormFieldType })}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Width</Label>
              <Select value={field.width ?? "full"} onValueChange={(v) => onUpdate({ width: v as "full" | "half" })}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full</SelectItem>
                  <SelectItem value="half">Half</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2 pb-0.5">
              <Switch checked={field.required} onCheckedChange={(v) => onUpdate({ required: v })} />
              <Label className="text-xs">Required</Label>
            </div>
          </div>
          <div>
            <Label className="text-xs">Placeholder</Label>
            <Input value={field.placeholder ?? ""} onChange={(e) => onUpdate({ placeholder: e.target.value || undefined })} className="text-xs h-7" />
          </div>

          {needsOptions && (
            <OptionsEditor options={field.options ?? []} onChange={onUpdateOptions} />
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Min Length</Label>
              <Input
                type="number"
                value={field.validation?.minLength ?? ""}
                onChange={(e) => onUpdate({ validation: { ...field.validation, minLength: e.target.value ? parseInt(e.target.value) : undefined } })}
                className="text-xs h-7"
              />
            </div>
            <div>
              <Label className="text-xs">Max Length</Label>
              <Input
                type="number"
                value={field.validation?.maxLength ?? ""}
                onChange={(e) => onUpdate({ validation: { ...field.validation, maxLength: e.target.value ? parseInt(e.target.value) : undefined } })}
                className="text-xs h-7"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OptionsEditor({ options, onChange }: { options: FormFieldOption[]; onChange: (opts: FormFieldOption[]) => void }) {
  function addOption() {
    onChange([...options, { label: "", value: "" }]);
  }

  function removeOption(idx: number) {
    onChange(options.filter((_, i) => i !== idx));
  }

  function updateOption(idx: number, updates: Partial<FormFieldOption>) {
    onChange(options.map((opt, i) => (i === idx ? { ...opt, ...updates } : opt)));
  }

  return (
    <div className="space-y-1">
      <Label className="text-xs">Options</Label>
      {options.map((opt, idx) => (
        <div key={idx} className="flex gap-1 items-center">
          <Input
            value={opt.label}
            onChange={(e) => {
              const label = e.target.value;
              const value = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
              updateOption(idx, { label, value });
            }}
            placeholder="Option label"
            className="text-xs h-7 flex-1"
          />
          <Input
            value={opt.value}
            onChange={(e) => updateOption(idx, { value: e.target.value })}
            placeholder="Value"
            className="text-xs h-7 w-24"
          />
          <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeOption(idx)}>
            <X className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="text-xs h-6 w-full" onClick={addOption}>
        <Plus className="h-3 w-3 mr-1" /> Add Option
      </Button>
    </div>
  );
}
