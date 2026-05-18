"use client";

import { useMemo, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useSubmitServiceApplication } from "@/lib/hooks/use-cms";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { FormSchema, FormField as FormFieldDef, FormSection } from "@/lib/api/services/cms";

function buildFieldSchema(field: FormFieldDef): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  switch (field.type) {
    case "email":
      schema = z.string().email("Please enter a valid email address");
      break;
    case "number": {
      let numSchema = z.coerce.number();
      if (field.validation?.min !== undefined) numSchema = numSchema.min(field.validation.min);
      if (field.validation?.max !== undefined) numSchema = numSchema.max(field.validation.max);
      if (!field.required) return numSchema.optional().or(z.literal("").transform(() => undefined));
      return numSchema;
    }
    case "checkbox":
      if (field.required) return z.literal(true, { message: "This field is required" });
      return z.boolean().default(false);
    default:
      schema = z.string();
      break;
  }

  // At this point, field.type is a string type (not number/checkbox — those returned early)
  let strSchema = schema as z.ZodString;
  if (field.validation?.minLength) strSchema = strSchema.min(field.validation.minLength, `Minimum ${field.validation.minLength} characters`);
  if (field.validation?.maxLength) strSchema = strSchema.max(field.validation.maxLength, `Maximum ${field.validation.maxLength} characters`);
  if (field.validation?.pattern) strSchema = strSchema.regex(new RegExp(field.validation.pattern), field.validation.patternMessage || "Invalid format");

  if (field.required) {
    strSchema = strSchema.min(1, "This field is required") as z.ZodString;
  }
  schema = strSchema;

  if (!field.required) {
    schema = schema.optional().or(z.literal(""));
  }

  return schema;
}

function buildZodSchema(formSchema: FormSchema): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const section of formSchema.sections) {
    for (const field of section.fields) {
      if (field.name) {
        shape[field.name] = buildFieldSchema(field);
      }
    }
  }
  return z.object(shape);
}

function getDefaults(formSchema: FormSchema): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const section of formSchema.sections) {
    for (const field of section.fields) {
      if (field.name) {
        if (field.type === "checkbox") defaults[field.name] = false;
        else defaults[field.name] = field.defaultValue ?? "";
      }
    }
  }
  return defaults;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function extractApplicantInfo(formSchema: FormSchema, data: Record<string, unknown>) {
  let applicantName = "";
  let applicantEmail = "";
  let applicantPhone = "";

  // Pass 1: Match by field type from schema
  for (const section of formSchema.sections) {
    for (const field of section.fields) {
      const val = data[field.name];
      if (typeof val !== "string" || !val.trim()) continue;
      if (!applicantEmail && field.type === "email") applicantEmail = val;
      if (!applicantPhone && field.type === "tel") applicantPhone = val;
    }
  }

  // Pass 2: Match by field name patterns from schema
  for (const section of formSchema.sections) {
    for (const field of section.fields) {
      const val = data[field.name];
      if (typeof val !== "string" || !val.trim()) continue;
      const k = field.name.toLowerCase();
      if (!applicantEmail && (k.includes("email") || k.includes("e_mail"))) applicantEmail = val;
      if (!applicantPhone && (k.includes("phone") || k.includes("mobile") || k.includes("tel") || k.includes("contact"))) applicantPhone = val;
      if (!applicantName && (k.includes("name") || k.includes("full_name") || k.includes("fullname")) && !k.includes("email") && !k.includes("user")) applicantName = val;
    }
  }

  // Pass 3: Fallback — scan all form data values for email pattern
  if (!applicantEmail) {
    for (const val of Object.values(data)) {
      if (typeof val === "string" && EMAIL_REGEX.test(val.trim())) {
        applicantEmail = val.trim();
        break;
      }
    }
  }

  // Pass 4: Fallback — use first non-empty text value as name
  if (!applicantName) {
    for (const val of Object.values(data)) {
      if (typeof val === "string" && val.trim() && !EMAIL_REGEX.test(val) && val.length < 100) {
        applicantName = val.trim();
        break;
      }
    }
  }

  return { applicantName: applicantName || "Unknown", applicantEmail, applicantPhone };
}

interface DynamicFormProps {
  serviceId: string;
  formSchema: FormSchema;
  onSuccess: () => void;
}

export function DynamicForm({ serviceId, formSchema, onSuccess }: DynamicFormProps) {
  const zodSchema = useMemo(() => buildZodSchema(formSchema), [formSchema]);
  const defaults = useMemo(() => getDefaults(formSchema), [formSchema]);
  const submitMutation = useSubmitServiceApplication();
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(zodSchema),
    defaultValues: defaults,
  });

  // Auto-close dialog after success
  useEffect(() => {
    if (submitStatus !== "success") return;
    const timer = setTimeout(() => onSuccess(), 2500);
    return () => clearTimeout(timer);
  }, [submitStatus, onSuccess]);

  function onSubmit(data: Record<string, unknown>) {
    const { applicantName, applicantEmail, applicantPhone } = extractApplicantInfo(formSchema, data);
    setSubmitStatus("idle");
    submitMutation.mutate(
      {
        serviceId,
        formData: data,
        applicantName,
        applicantEmail,
        applicantPhone: applicantPhone || undefined,
      },
      {
        onSuccess: () => setSubmitStatus("success"),
        onError: () => setSubmitStatus("error"),
      }
    );
  }

  if (submitStatus === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle2 className="h-9 w-9 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-xl font-semibold">Application Submitted!</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Thank you for your application. We&apos;ll review it and contact you soon.
        </p>
        <Button variant="outline" size="sm" onClick={onSuccess}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {submitStatus === "error" && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
          <XCircle className="h-5 w-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive">
            Failed to submit application. Please check your details and try again.
          </p>
        </div>
      )}

      {formSchema.sections.map((section, sectionIdx) => (
        <SectionRenderer
          key={section.id}
          section={section}
          sectionIndex={sectionIdx + 1}
          register={register}
          watch={watch}
          setValue={setValue}
          errors={errors}
        />
      ))}

      <div className="flex justify-end gap-4 pt-4">
        <Button type="submit" disabled={submitMutation.isPending} className="min-w-[120px]">
          {submitMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Application"
          )}
        </Button>
      </div>
    </form>
  );
}

function SectionRenderer({
  section,
  sectionIndex,
  register,
  watch,
  setValue,
  errors,
}: {
  section: FormSection;
  sectionIndex: number;
  register: ReturnType<typeof useForm>["register"];
  watch: ReturnType<typeof useForm>["watch"];
  setValue: ReturnType<typeof useForm>["setValue"];
  errors: Record<string, any>;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold border-b pb-2">
        {sectionIndex}. {section.title}
        {section.fields.some((f) => f.required) && " (*)"}
      </h3>
      {section.description && (
        <p className="text-sm text-muted-foreground">{section.description}</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {section.fields.map((field) => (
          <div
            key={field.id}
            className={field.width === "half" ? "" : "md:col-span-2"}
          >
            <DynamicFormField
              field={field}
              register={register}
              watch={watch}
              setValue={setValue}
              error={errors[field.name]}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function DynamicFormField({
  field,
  register,
  watch,
  setValue,
  error,
}: {
  field: FormFieldDef;
  register: ReturnType<typeof useForm>["register"];
  watch: ReturnType<typeof useForm>["watch"];
  setValue: ReturnType<typeof useForm>["setValue"];
  error: any;
}) {
  const fieldValue = watch(field.name);

  if (field.type === "select") {
    return (
      <div>
        <Label>{field.label}{field.required && " *"}</Label>
        <Select
          value={fieldValue || ""}
          onValueChange={(value) => setValue(field.name, value, { shouldValidate: true })}
        >
          <SelectTrigger>
            <SelectValue placeholder={field.placeholder || "Select..."} />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error && <p className="text-sm text-destructive mt-1">{error.message as string}</p>}
      </div>
    );
  }

  if (field.type === "radio") {
    return (
      <div>
        <Label>{field.label}{field.required && " *"}</Label>
        <div className="flex flex-wrap gap-4 mt-2">
          {field.options?.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                {...register(field.name)}
                value={opt.value}
                className="accent-primary h-4 w-4"
              />
              {opt.label}
            </label>
          ))}
        </div>
        {error && <p className="text-sm text-destructive mt-1">{error.message as string}</p>}
      </div>
    );
  }

  if (field.type === "checkbox") {
    return (
      <div>
        <label className="flex items-center gap-2 text-sm cursor-pointer mt-2">
          <input
            type="checkbox"
            {...register(field.name)}
            className="accent-primary h-4 w-4"
          />
          {field.label}{field.required && " *"}
        </label>
        {error && <p className="text-sm text-destructive mt-1">{error.message as string}</p>}
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div>
        <Label htmlFor={field.name}>{field.label}{field.required && " *"}</Label>
        <textarea
          id={field.name}
          {...register(field.name)}
          placeholder={field.placeholder}
          rows={3}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
        {error && <p className="text-sm text-destructive mt-1">{error.message as string}</p>}
      </div>
    );
  }

  // text, email, tel, number, date
  return (
    <div>
      <Label htmlFor={field.name}>{field.label}{field.required && " *"}</Label>
      <Input
        id={field.name}
        type={field.type}
        {...register(field.name)}
        placeholder={field.placeholder}
      />
      {error && <p className="text-sm text-destructive mt-1">{error.message as string}</p>}
    </div>
  );
}
