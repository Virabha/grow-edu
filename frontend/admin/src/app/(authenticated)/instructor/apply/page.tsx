"use client";

import * as React from "react";
import { toast } from "sonner";
import { CheckCircle2, Clock, Send } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateResource } from "@/lib/hooks/use-resource";
import { getApiError } from "@/lib/api/errors";

interface Form {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  expertise: string;
  experienceYears: string;
  qualification: string;
  bio: string;
}

const EMPTY: Form = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  expertise: "",
  experienceYears: "",
  qualification: "",
  bio: "",
};

const STEPS = [
  {
    title: "Apply",
    body: "Tell us what you teach and where you have taught it.",
  },
  {
    title: "We review",
    body: "The academic team looks at every application on Fridays.",
  },
  {
    title: "Start building",
    body: "Once approved, the course builder unlocks on your dashboard.",
  },
];

export default function InstructorApplyPage() {
  const [form, setForm] = React.useState<Form>(EMPTY);
  const [errors, setErrors] = React.useState<Partial<Record<keyof Form, string>>>({});
  const [submitted, setSubmitted] = React.useState(false);

  const apply = useCreateResource("teacher-applications");

  function set<K extends keyof Form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();

    const next: Partial<Record<keyof Form, string>> = {};
    if (!form.firstName.trim()) next.firstName = "First name is required";
    if (!form.lastName.trim()) next.lastName = "Last name is required";
    if (!form.email.includes("@")) next.email = "Enter a valid email address";
    if (!form.expertise.trim()) next.expertise = "Tell us what you teach";
    if (form.bio.trim().length < 40)
      next.bio = "Write at least 40 characters so we can assess the application";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    apply.mutate(
      {
        fullName: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        expertise: form.expertise.trim(),
        experienceYears: Number(form.experienceYears) || 0,
        qualification: form.qualification.trim(),
        bio: form.bio.trim(),
        status: "PENDING",
      },
      {
        onSuccess: () => {
          toast.success("Application submitted");
          setSubmitted(true);
        },
        onError: (err) =>
          toast.error(getApiError(err, "Could not submit the application").message),
      },
    );
  }

  if (submitted) {
    return (
      <PageLayout subtitle="Teaching" header="Application received">
        <Card className="max-w-xl">
          <CardContent className="space-y-3 py-8 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <h2 className="text-lg font-semibold">Thanks — that is with us</h2>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              The academic team reviews applications every Friday. You will get an
              email either way, and the course builder unlocks automatically if you
              are approved.
            </p>
            <div className="flex items-center justify-center gap-1.5 pt-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Typically within five working days
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                setForm(EMPTY);
                setSubmitted(false);
              }}
            >
              Submit another application
            </Button>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      subtitle="Teaching"
      header="Become an instructor"
      description="Apply to publish courses on grotutor."
    >
      <div className="grid gap-4 [&>*]:min-w-0 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Your application</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  id="first-name"
                  label="First name"
                  value={form.firstName}
                  onChange={(v) => set("firstName", v)}
                  error={errors.firstName}
                />
                <Field
                  id="last-name"
                  label="Last name"
                  value={form.lastName}
                  onChange={(v) => set("lastName", v)}
                  error={errors.lastName}
                />
                <Field
                  id="email"
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(v) => set("email", v)}
                  error={errors.email}
                />
                <Field
                  id="phone"
                  label="Phone"
                  value={form.phone}
                  onChange={(v) => set("phone", v)}
                  placeholder="+91 98765 43210"
                />
              </div>

              <Field
                id="expertise"
                label="What do you teach?"
                value={form.expertise}
                onChange={(v) => set("expertise", v)}
                error={errors.expertise}
                placeholder="Chemistry — JEE and NEET"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  id="years"
                  label="Years of experience"
                  type="number"
                  value={form.experienceYears}
                  onChange={(v) => set("experienceYears", v)}
                />
                <Field
                  id="qualification"
                  label="Highest qualification"
                  value={form.qualification}
                  onChange={(v) => set("qualification", v)}
                  placeholder="MSc Chemistry, IIT Madras"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bio">About you</Label>
                <Textarea
                  id="bio"
                  rows={5}
                  value={form.bio}
                  onChange={(e) => set("bio", e.target.value)}
                  placeholder="Where you have taught, what results your learners got, and what you would build here."
                  aria-invalid={!!errors.bio}
                  aria-describedby={errors.bio ? "bio-error" : undefined}
                />
                {errors.bio && (
                  <p id="bio-error" className="text-xs text-destructive" role="alert">
                    {errors.bio}
                  </p>
                )}
              </div>

              <Button type="submit" disabled={apply.isPending}>
                <Send className="mr-1.5 h-4 w-4" />
                {apply.isPending ? "Submitting…" : "Submit application"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">How this works</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
              Instructors keep 70% of every sale. The platform covers hosting,
              streaming, payments and support.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
