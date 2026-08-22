"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v3";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Loader2,
  Users,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useService, useSubmitServiceApplication } from "@/lib/hooks/use-cms";
import { getApiError } from "@/lib/api/errors";

const SERVICE_SLUG = "become-teacher";

const applicationSchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  phone: z.string().trim().optional(),
  subject: z.string().trim().min(2, "Tell us what you teach"),
  experience: z.string().trim().min(1, "Tell us how long you have taught"),
  about: z
    .string()
    .trim()
    .min(40, "A few sentences help us understand your teaching"),
});

type ApplicationFormValues = z.infer<typeof applicationSchema>;

const reasons = [
  {
    icon: Users,
    title: "Teach at scale",
    body: "One batch reaches hundreds of students preparing for the same exam, not a room of twelve.",
  },
  {
    icon: Wallet,
    title: "Paid per batch",
    body: "Compensation is agreed per batch before it starts, so you know what a cohort is worth to you.",
  },
  {
    icon: Clock,
    title: "Structured schedule",
    body: "Timetables, recordings and doubt sessions are managed by the platform, not by you.",
  },
  {
    icon: BookOpen,
    title: "Content support",
    body: "Question banks, practice sets and assessment tooling already exist. You bring the teaching.",
  },
];

const steps = [
  "Tell us what you teach and where you have taught before",
  "A short conversation with the academic team",
  "A recorded demonstration lesson on a topic you choose",
  "Onboarding, then your first batch",
];

export default function BecomeTeacherPage() {
  const { data: service, isLoading } = useService(SERVICE_SLUG);
  const submit = useSubmitServiceApplication(service?.serviceId);

  const [submitted, setSubmitted] = useState<ApplicationFormValues | null>(null);

  const applicationsOpen = Boolean(service?.serviceId);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      subject: "",
      experience: "",
      about: "",
    },
  });

  const onSubmit = async (data: ApplicationFormValues) => {
    try {
      await submit.mutateAsync({
        applicantName: data.fullName,
        applicantEmail: data.email,
        applicantPhone: data.phone || undefined,
        formData: {
          subject: data.subject,
          experience: data.experience,
          about: data.about,
        },
      });
      setSubmitted(data);
      toast.success("Application received. We will be in touch.");
    } catch (err) {
      toast.error(
        getApiError(err, "Could not send your application. Please try again.")
          .message,
      );
    }
  };

  return (
    <main className="bg-background">
      <section className="relative overflow-hidden border-b border-border bg-foreground py-16 text-background md:py-20">
        <Image
          src="/images/landing/classroom-2.jpg"
          alt=""
          fill
          className="object-cover opacity-30"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-foreground/85 via-foreground/70 to-foreground/45" />
        <div className="absolute inset-0 bg-primary/15 mix-blend-multiply" />
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-2xl"
          >
            <p className="text-sm font-medium uppercase tracking-wide text-background/70">
              Teach with us
            </p>
            <h1 className="mt-3 text-3xl font-semibold md:text-5xl">
              {service?.title ?? "Become an instructor"}
            </h1>
            <p className="mt-4 text-base text-background/80 md:text-lg">
              {service?.description ??
                "We are looking for teachers who can hold a cohort's attention for two hours and leave them able to solve the problem themselves."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="#apply">
                  Apply to teach
                  <ArrowUpRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/instructors">Meet the faculty</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold md:text-3xl">
          Why teach on groEdu
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {reasons.map((reason) => (
            <div
              key={reason.title}
              className="rounded-lg border border-border bg-card p-6"
            >
              <reason.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-medium">{reason.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{reason.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-muted/40 py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold md:text-3xl">
            How the process works
          </h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-4">
            {steps.map((step, index) => (
              <li key={step} className="rounded-lg bg-background p-6">
                <span className="text-sm font-semibold text-primary">
                  Step {index + 1}
                </span>
                <p className="mt-2 text-sm text-muted-foreground">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="apply" className="container mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-semibold md:text-3xl">Apply to teach</h2>

          {submitted ? (
            <div className="mt-8 rounded-lg border border-border bg-card p-8 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
              <h3 className="mt-4 text-lg font-medium">Application received</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Thank you, {submitted.fullName}. The academic team reviews every
                application and will contact you at {submitted.email}.
              </p>
              <Button asChild className="mt-6" variant="outline">
                <Link href="/">Back to home</Link>
              </Button>
            </div>
          ) : (
            <>
              {!isLoading && !applicationsOpen && (
                <p className="mt-4 rounded-md border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
                  Applications are not open at the moment. Write to us and we
                  will let you know when the next intake begins.
                </p>
              )}

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="mt-8 space-y-5"
                noValidate
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input id="fullName" {...register("fullName")} />
                    {errors.fullName && (
                      <p className="text-sm text-destructive">
                        {errors.fullName.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" {...register("email")} />
                    {errors.email && (
                      <p className="text-sm text-destructive">
                        {errors.email.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone (optional)</Label>
                    <Input id="phone" {...register("phone")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject you teach</Label>
                    <Input
                      id="subject"
                      placeholder="Physics, Organic Chemistry, Data Structures"
                      {...register("subject")}
                    />
                    {errors.subject && (
                      <p className="text-sm text-destructive">
                        {errors.subject.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience">Years of teaching experience</Label>
                  <Input
                    id="experience"
                    placeholder="4 years, JEE Physics"
                    {...register("experience")}
                  />
                  {errors.experience && (
                    <p className="text-sm text-destructive">
                      {errors.experience.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="about">Tell us about your teaching</Label>
                  <Textarea
                    id="about"
                    rows={5}
                    placeholder="Where have you taught, what results have your students seen, and how do you approach a topic students usually find hard?"
                    {...register("about")}
                  />
                  {errors.about && (
                    <p className="text-sm text-destructive">
                      {errors.about.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={submit.isPending || !applicationsOpen}
                >
                  {submit.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send application"
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
