"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSubmitContact } from "@/lib/hooks/use-contact";
import { toast } from "sonner";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "success">("idle");
  const [formData, setFormData] = useState({
    message: "",
    subject: "",
    name: "",
    email: "",
  });
  const submitContact = useSubmitContact();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    submitContact.mutate(formData, {
      onSuccess: () => {
        setStatus("success");
        setFormData({ message: "", subject: "", name: "", email: "" });
        toast.success("Message sent successfully!");
      },
      onError: () => {
        toast.error("Failed to send message. Please try again.");
      },
    });
  };

  const inputClass = cn(
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none",
    "placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="contact-comment" className="mb-1 block text-sm font-medium">
          Comment <span className="text-destructive">*</span>
        </label>
        <textarea
          id="contact-comment"
          required
          rows={4}
          value={formData.message}
          onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
          className={inputClass}
          placeholder="Your message..."
        />
      </div>
      <div>
        <label htmlFor="contact-subject" className="mb-1 block text-sm font-medium">
          Subject <span className="text-destructive">*</span>
        </label>
        <input
          id="contact-subject"
          type="text"
          required
          value={formData.subject}
          onChange={(e) => setFormData((p) => ({ ...p, subject: e.target.value }))}
          className={inputClass}
          placeholder="Subject"
        />
      </div>
      <div>
        <label htmlFor="contact-name" className="mb-1 block text-sm font-medium">
          Name <span className="text-destructive">*</span>
        </label>
        <input
          id="contact-name"
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
          className={inputClass}
          placeholder="Your name"
        />
      </div>
      <div>
        <label htmlFor="contact-email" className="mb-1 block text-sm font-medium">
          E-mail <span className="text-destructive">*</span>
        </label>
        <input
          id="contact-email"
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
          className={inputClass}
          placeholder="Your e-mail"
        />
      </div>
      <Button type="submit" disabled={submitContact.isPending}>
        {submitContact.isPending ? "Sending…" : "Send Us Message"}
      </Button>
      {status === "success" && (
        <p className="text-sm text-primary" role="status">
          Message sent. We&apos;ll get back to you soon.
        </p>
      )}
    </form>
  );
}
