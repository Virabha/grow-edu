"use client";

import { useState, useRef } from "react";
import { z } from "zod/v3";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Send,
  Mail,
  Phone,
  MapPin,
  Clock,
  ExternalLink,
  Upload,
  FileText,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubmitContact, useUploadDocument } from "@/lib/hooks/use-contact";
import { toast } from "sonner";
import { BRAND } from "@/lib/constants";

const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/jpg",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  mobile: z
    .string()
    .min(10, "Mobile number must be at least 10 digits")
    .regex(/^[+]?[\d\s-]{10,15}$/, "Please enter a valid mobile number"),
  subject: z.string().min(1, "Please select a subject"),
  courseInterested: z.string().min(1, "Please select a course"),
  role: z.string().min(1, "Please select a role"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormValues = z.infer<typeof contactSchema>;

const subjects = [
  "Course Enquiry",
  "Certificate Support",
  "Payment Issue",
  "Become an Instructor",
  "General Question",
  "Other",
];

const courseOptions = ["Professional", "IIT-JEE", "NEET", "Foundation"];

const roleOptions = ["Student", "Instructor"];

const infoCards = [
  {
    icon: Mail,
    title: "Email Us",
    value: BRAND.email,
    sub: "Typically responds in < 6 hours",
    href: `mailto:${BRAND.email}`,
    color: "#3b82f6",
    hoverColor: "hover:bg-indigo-50 hover:border-indigo-400",
  },
  {
    icon: Phone,
    title: "Call Us",
    value: BRAND.phone,
    sub: "Mon–Sat, 9 am – 6 pm IST",
    href: `tel:${BRAND.phone.replace(/[^+\d]/g, "")}`,
    color: "#f97316",
    hoverColor: "hover:bg-orange-50 hover:border-orange-400",
  },
  {
    icon: MapPin,
    title: "Our Office",
    value: "Unit # 1801, Vasavi Sky City",
    sub: "Gachibowli X Road, Hyderabad, Telangana",
    href: "https://maps.google.com/?q=Vasavi+Sky+City+Gachibowli+Hyderabad",
    color: "#10b981",
    hoverColor: "hover:bg-emerald-50 hover:border-emerald-400",
  },
  {
    icon: Clock,
    title: "Working Hours",
    value: "Mon – Sat",
    sub: "9:00 am – 6:00 pm IST",
    href: null,
    color: "#0ea5e9",
    hoverColor: "hover:bg-sky-50 hover:border-sky-400",
  },
];

const inputClasses =
  "w-full rounded-lg border-2 border-black/60 bg-background px-3 py-2.5 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15";
const errorInputClasses =
  "w-full rounded-lg border-2 border-destructive bg-background px-3 py-2.5 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-destructive/50 focus:ring-2 focus:ring-destructive/15";

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submitContact = useSubmitContact();
  const uploadDocument = useUploadDocument();

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      mobile: "",
      subject: subjects[0],
      courseInterested: courseOptions[0],
      role: roleOptions[0],
      message: "",
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      toast.error("Only PDF, DOC, DOCX, and JPEG files are allowed");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (values: ContactFormValues) => {
    let documentUrl: string | undefined;

    if (selectedFile) {
      try {
        const result = await uploadDocument.mutateAsync(selectedFile);
        documentUrl = result.url;
      } catch {
        toast.error("Failed to upload document. Please try again.");
        return;
      }
    }

    submitContact.mutate(
      {
        ...values,
        documentUrl,
      },
      {
        onSuccess: () => {
          setSent(true);
          toast.success("Message sent successfully!");
        },
        onError: () => {
          toast.error("Failed to send message. Please try again.");
        },
      },
    );
  };

  const isSubmitting = submitContact.isPending || uploadDocument.isPending;

  return (
    <main>
      <section className="relative overflow-hidden border-b-2 border-black bg-[#000052] py-14 md:py-14">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate="show"
            className="mx-auto max-w-3xl text-white text-center"
          >
            <h1 className="section-heading mt-2 text-3xl font-black text-white sm:text-4xl md:text-5xl">
              Contact Us
            </h1>
            <p className="mt-3 leading-relaxed text-white text-base">
              Have a question about a course, certificate, or career path? Our
              team is here to help.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {infoCards.map((card, i) => (
              <motion.div
                key={card.title}
                viewport={{ once: true }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                {card.href ? (
                  <a
                    href={card.href}
                    target={card.href.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className={`group flex h-full flex-col gap-2 rounded-xl border-2 border-black/80 bg-white/60 backdrop-blur-sm p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${card.hoverColor}`}
                  >
                    <div
                      className="flex size-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110 duration-200"
                      style={{ background: `${card.color}15` }}
                    >
                      <card.icon
                        className="size-5"
                        style={{ color: card.color }}
                      />
                    </div>
                    <p className="text-xs font-bold text-foreground">
                      {card.title}
                    </p>
                    <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                      {card.value}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {card.sub}
                    </p>
                  </a>
                ) : (
                  <div
                    className={`flex h-full flex-col gap-2 rounded-xl border-2 border-black/80 bg-white/60 backdrop-blur-sm p-4 transition-all duration-200 ${card.hoverColor}`}
                  >
                    <div
                      className="flex size-10 items-center justify-center rounded-xl"
                      style={{ background: `${card.color}15` }}
                    >
                      <card.icon
                        className="size-5"
                        style={{ color: card.color }}
                      />
                    </div>
                    <p className="text-xs font-bold text-foreground">
                      {card.title}
                    </p>
                    <p className="text-xs font-semibold text-foreground">
                      {card.value}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {card.sub}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-10 md:pb-14">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <AnimatePresence mode="wait">
              {sent ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-green-500 bg-green-50 p-6 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 10, stiffness: 200 }}
                  >
                    <CheckCircle2 className="size-16 text-green-500" />
                  </motion.div>
                  <h2 className="text-xl font-black text-foreground">
                    Message Sent!
                  </h2>
                  <p className="max-w-xs text-sm text-muted-foreground">
                    Thanks for reaching out to {BRAND.name}. We&apos;ll get back
                    to you within 24 hours.
                  </p>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  onSubmit={handleSubmit(onSubmit)}
                  className="rounded-2xl border-2 border-black/80 bg-white/60 backdrop-blur-sm p-6 shadow-sm transition-all duration-200 hover:shadow-lg hover:border-primary/60"
                >
                  <div className="mb-5 flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                      <Send className="size-4 text-primary" />
                    </div>
                    <h2 className="font-bold text-foreground">
                      Send us a Message
                    </h2>
                  </div>
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="contact-name"
                          className="mb-1 block text-xs font-semibold text-foreground"
                        >
                          Full Name *
                        </label>
                        <input
                          {...register("name")}
                          placeholder="Your name"
                          id="contact-name"
                          className={
                            errors.name ? errorInputClasses : inputClasses
                          }
                        />
                        {errors.name && (
                          <p className="mt-1 text-xs text-destructive">
                            {errors.name.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label
                          htmlFor="contact-email"
                          className="mb-1 block text-xs font-semibold text-foreground"
                        >
                          Email *
                        </label>
                        <input
                          {...register("email")}
                          type="email"
                          placeholder="you@email.com"
                          id="contact-email"
                          className={
                            errors.email ? errorInputClasses : inputClasses
                          }
                        />
                        {errors.email && (
                          <p className="mt-1 text-xs text-destructive">
                            {errors.email.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="contact-mobile"
                        className="mb-1 block text-xs font-semibold text-foreground"
                      >
                        Mobile Number *
                      </label>
                      <input
                        {...register("mobile")}
                        type="tel"
                        placeholder="+91 XXXXX XXXXX"
                        id="contact-mobile"
                        className={
                          errors.mobile ? errorInputClasses : inputClasses
                        }
                      />
                      {errors.mobile && (
                        <p className="mt-1 text-xs text-destructive">
                          {errors.mobile.message}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="contact-course"
                          className="mb-1 block text-xs font-semibold text-foreground"
                        >
                          Course Interested *
                        </label>
                        <select
                          {...register("courseInterested")}
                          id="contact-course"
                          className={
                            errors.courseInterested
                              ? errorInputClasses
                              : inputClasses
                          }
                        >
                          {courseOptions.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        {errors.courseInterested && (
                          <p className="mt-1 text-xs text-destructive">
                            {errors.courseInterested.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label
                          htmlFor="contact-role"
                          className="mb-1 block text-xs font-semibold text-foreground"
                        >
                          Role *
                        </label>
                        <select
                          {...register("role")}
                          id="contact-role"
                          className={
                            errors.role ? errorInputClasses : inputClasses
                          }
                        >
                          {roleOptions.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                        {errors.role && (
                          <p className="mt-1 text-xs text-destructive">
                            {errors.role.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="contact-subject"
                        className="mb-1 block text-xs font-semibold text-foreground"
                      >
                        Subject
                      </label>
                      <select
                        {...register("subject")}
                        id="contact-subject"
                        className={inputClasses}
                      >
                        {subjects.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                      {errors.subject && (
                        <p className="mt-1 text-xs text-destructive">
                          {errors.subject.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="contact-message"
                        className="mb-1 block text-xs font-semibold text-foreground"
                      >
                        Message *
                      </label>
                      <textarea
                        {...register("message")}
                        rows={4}
                        placeholder="Tell us how we can help…"
                        id="contact-message"
                        className={`resize-none ${errors.message ? errorInputClasses : inputClasses}`}
                      />
                      {errors.message && (
                        <p className="mt-1 text-xs text-destructive">
                          {errors.message.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-foreground">
                        Upload Document (PDF, DOC, JPEG)
                      </label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.jpeg,.jpg"
                        onChange={handleFileChange}
                        className="hidden"
                        id="contact-file"
                      />
                      {selectedFile ? (
                        <div className="flex items-center gap-3 rounded-lg border-2 border-black/60 bg-muted/30 px-3 py-2.5">
                          <FileText className="size-5 shrink-0 text-primary" />
                          <span className="flex-1 truncate text-sm text-foreground">
                            {selectedFile.name}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {(selectedFile.size / 1024).toFixed(0)} KB
                          </span>
                          <button
                            type="button"
                            onClick={handleRemoveFile}
                            className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            aria-label="Remove file"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-black/40 bg-muted/20 px-3 py-4 text-sm text-muted-foreground transition-all hover:border-primary hover:bg-primary/5 hover:text-primary"
                        >
                          <Upload className="size-4" />
                          Click to upload (max 5MB)
                        </button>
                      )}
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full gap-2 bg-primary font-semibold shadow hover:bg-primary/90 transition-all hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <Send className="size-3.5" />
                      {isSubmitting ? "Sending…" : "Send Message"}
                    </Button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex flex-col gap-0 overflow-hidden rounded-2xl border-2 border-black/80 bg-white/60 backdrop-blur-sm shadow-sm transition-all duration-200 hover:shadow-lg hover:border-primary/60"
            >
              <div className="flex items-center justify-between border-b-2 border-black/60 bg-white/30 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
                    <MapPin className="size-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">
                      grotutor HQ
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Unit # 1801, Vasavi Sky City, Gachibowli X Road, Hyderabad
                    </p>
                  </div>
                </div>
                <a
                  href="https://maps.google.com/?q=Vasavi+Sky+City+Gachibowli+X+Road+Hyderabad+Telangana"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-lg border-2 border-black/60 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-all hover:border-primary hover:text-primary hover:bg-primary/5"
                >
                  Open Maps <ExternalLink className="size-3" />
                </a>
              </div>

              <div className="relative flex-1 min-h-[320px]">
                <iframe
                  title="grotutor Office — Gachibowli, Hyderabad"
                  src="https://maps.google.com/maps?q=Vasavi+Sky+City+Gachibowli+X+Road+Hyderabad+Telangana&t=&z=15&ie=UTF8&iwloc=&output=embed"
                  className="h-full w-full border-0"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  style={{ minHeight: "320px" }}
                />
              </div>

              <div className="border-t-2 border-black/60 px-4 py-3 text-xs text-muted-foreground">
                {BRAND.address}
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </main>
  );
}
