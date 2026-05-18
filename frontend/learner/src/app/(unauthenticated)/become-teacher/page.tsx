"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v3";
import {
  Users,
  Clock,
  IndianRupee,
  Wrench,
  FileCheck,
  UserPlus,
  BookOpen,
  Rocket,
  Send,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCategories } from "@/lib/hooks/use-categories";
import { teacherApplicationsApi } from "@/lib/api/services/teacher-applications";
import { toast } from "sonner";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.08 },
  }),
};

const benefits = [
  { icon: Users, title: "Reach 50,000+ Students", desc: "Get instant access to our growing community of motivated learners across India looking to upskill.", color: "#6366f1" },
  { icon: Clock, title: "Flexible Schedule", desc: "Teach on your own time. Create recorded courses or host live sessions — you decide when and how.", color: "#f97316" },
  { icon: IndianRupee, title: "Earn Competitive Revenue", desc: "Earn up to 70% revenue share on every enrollment. Get paid monthly with transparent earnings dashboards.", color: "#10b981" },
  { icon: Wrench, title: "World-Class Tools", desc: "Access our studio-grade recording tools, analytics dashboard, student management, and marketing support.", color: "#ec4899" },
];

const steps = [
  { icon: UserPlus, step: "01", title: "Apply & Get Approved", desc: "Fill out the application form below. Our team reviews your profile, expertise, and teaching experience within 48 hours." },
  { icon: BookOpen, step: "02", title: "Create Your Course", desc: "Use our intuitive course builder to upload videos, create quizzes, add resources, and structure your curriculum." },
  { icon: FileCheck, step: "03", title: "Quality Review", desc: "Our content team reviews your course for quality, accuracy, and production standards before publishing." },
  { icon: Rocket, step: "04", title: "Go Live & Earn", desc: "Your course goes live on Loshi Edu. Start reaching students, track analytics, and earn revenue from day one." },
];

const teacherSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  experienceYears: z.string().optional(),
  whyJoin: z.string().optional(),
});

type TeacherFormData = z.infer<typeof teacherSchema>;

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/15";

export default function BecomeTeacherPage() {
  const {
    register,
    handleSubmit: rhfHandleSubmit,
    formState: { errors },
    reset,
  } = useForm<TeacherFormData>({
    resolver: zodResolver(teacherSchema),
    defaultValues: { fullName: "", email: "", phone: "", experienceYears: "", whyJoin: "" },
  });

  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvUrl, setCvUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: categories = [] } = useCategories();

  const addSkill = useCallback(() => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) {
      setSkills((prev) => [...prev, s]);
      setSkillInput("");
    }
  }, [skillInput, skills]);

  const removeSkill = useCallback((skill: string) => {
    setSkills((prev) => prev.filter((x) => x !== skill));
  }, []);

  const toggleCategory = useCallback((categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  }, []);

  const handleCvChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
      if (!allowed.includes(file.type)) {
        setError("Invalid file type. Use PDF, JPEG, PNG, or WebP.");
        return;
      }
      setCvFile(file);
      setUploading(true);
      setError(null);
      try {
        const { url } = await teacherApplicationsApi.uploadCv(file);
        setCvUrl(url);
      } catch {
        setError("CV upload failed. Please try again.");
        toast.error("CV upload failed");
        setCvFile(null);
      } finally {
        setUploading(false);
      }
    },
    []
  );

  const onSubmit = async (data: TeacherFormData) => {
    setError(null);
    setSubmitting(true);
    try {
      await teacherApplicationsApi.submit({
        fullName: data.fullName.trim(),
        email: data.email.trim(),
        phone: data.phone?.trim() || undefined,
        experienceYears: data.experienceYears ? Number(data.experienceYears) : undefined,
        skills: skills.length ? skills : undefined,
        categories: selectedCategories.length ? selectedCategories : undefined,
        cvUrl: cvUrl || undefined,
        whyJoin: data.whyJoin?.trim() || undefined,
      });
      setSubmitted(true);
      reset();
      setSkills([]);
      setSelectedCategories([]);
      setCvFile(null);
      setCvUrl("");
      toast.success("Application submitted successfully");
    } catch {
      setError("Submission failed. Please try again.");
      toast.error("Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground">Application submitted</h1>
        <p className="mt-2 text-muted-foreground">
          Thank you! We&apos;ll get back to you within 48 hours.
        </p>
        <Button asChild className="mt-6">
          <a href="/">Back to Home</a>
        </Button>
      </main>
    );
  }

  return (
    <main>
        <section className="border-b border-border bg-linear-to-br from-primary/5 via-background to-[#6366f1]/5 py-12 md:py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial="hidden" animate="show" variants={fadeUp} className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Join Our Team</p>
              <h1 className="mt-2 text-3xl font-black text-foreground sm:text-4xl md:text-5xl">
                Become an <span className="text-primary">Instructor</span>
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
                Share your expertise with thousands of learners. Join Loshi Edu&apos;s community of instructors and make an impact while earning on your own terms.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="py-10 md:py-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="mb-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Why Teach With Us</p>
              <h2 className="mt-1 text-xl font-bold text-foreground sm:text-2xl md:text-3xl">Benefits of Teaching on Loshi Edu</h2>
            </motion.div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {benefits.map((b, i) => (
                <motion.div
                  key={b.title}
                  custom={i}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  className="rounded-xl border border-border/60 bg-white/60 backdrop-blur-sm p-5 transition-all hover:shadow-md hover:border-primary/30"
                >
                  <div className="mb-3 flex size-10 items-center justify-center rounded-xl" style={{ background: `${b.color}15` }}>
                    <b.icon className="size-5" style={{ color: b.color }} />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">{b.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{b.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-muted/20 py-10 md:py-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="mb-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">How It Works</p>
              <h2 className="mt-1 text-xl font-bold text-foreground sm:text-2xl md:text-3xl">Steps to Become an Instructor</h2>
            </motion.div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s, i) => (
                <motion.div
                  key={s.step}
                  custom={i}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  className="relative rounded-xl border border-border/60 bg-white/60 backdrop-blur-sm p-5"
                >
                  <span className="absolute right-4 top-3 text-3xl font-black text-primary/10">{s.step}</span>
                  <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10">
                    <s.icon className="size-5 text-primary" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">{s.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-10 md:py-14" id="apply">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="mx-auto max-w-xl">
              <div className="mb-6 text-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">Apply Now</p>
                <h2 className="mt-1 text-xl font-bold text-foreground sm:text-2xl md:text-3xl">Start Your Teaching Journey</h2>
                <p className="mt-2 text-sm text-muted-foreground">Fill in your details and we&apos;ll get in touch within 48 hours.</p>
              </div>

              <form onSubmit={rhfHandleSubmit(onSubmit)} className="space-y-4 rounded-xl border border-border/60 bg-white/60 backdrop-blur-sm p-6">
                {error && (
                  <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
                )}
                <div>
                  <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-foreground">
                    Full Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="fullName"
                    {...register("fullName")}
                    placeholder="Enter your full name"
                    className={inputClass}
                  />
                  {errors.fullName && (
                    <p className="mt-1 text-xs text-destructive">{errors.fullName.message}</p>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="email" className="mb-1 block text-sm font-medium text-foreground">
                      Email <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="email"
                      {...register("email")}
                      placeholder="you@example.com"
                      className={inputClass}
                    />
                    {errors.email && (
                      <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="phone" className="mb-1 block text-sm font-medium text-foreground">Phone</label>
                    <input
                      id="phone"
                      {...register("phone")}
                      placeholder="+91-XXXXXXXXXX"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="experienceYears" className="mb-1 block text-sm font-medium text-foreground">Years of Experience</label>
                  <input
                    id="experienceYears"
                    type="number"
                    min={0}
                    {...register("experienceYears")}
                    placeholder="e.g. 5"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Skills</label>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                      >
                        {s}
                        <button type="button" onClick={() => removeSkill(s)} className="hover:opacity-80" aria-label="Remove">
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                        placeholder="Add skill"
                        className="w-28 rounded-lg border border-input bg-background px-2 py-1 text-sm outline-none focus:border-primary/50"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={addSkill}>Add</Button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Categories you want to teach</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat.categoryId}
                        type="button"
                        onClick={() => toggleCategory(cat.categoryId)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          selectedCategories.includes(cat.categoryId)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-muted/50 text-muted-foreground hover:border-primary/50 hover:text-primary"
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">CV / Resume</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept=".pdf,image/jpeg,image/png,image/webp"
                      onChange={handleCvChange}
                      disabled={uploading}
                      className="text-sm text-muted-foreground file:mr-2 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:text-primary-foreground file:hover:bg-primary/90"
                    />
                    {uploading && <span className="text-xs text-muted-foreground">Uploading...</span>}
                    {cvUrl && !uploading && <span className="text-xs text-green-600">Uploaded</span>}
                  </div>
                </div>
                <div>
                  <label htmlFor="whyJoin" className="mb-1 block text-sm font-medium text-foreground">Why do you want to join?</label>
                  <textarea
                    id="whyJoin"
                    {...register("whyJoin")}
                    rows={4}
                    placeholder="Tell us why you want to teach on Loshi Edu..."
                    className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
                  />
                </div>
                <Button type="submit" className="w-full gap-2" disabled={submitting || uploading}>
                  <Send className="size-4" />
                  {submitting ? "Submitting..." : "Submit Application"}
                </Button>
              </form>
            </motion.div>
          </div>
        </section>
    </main>
  );
}
