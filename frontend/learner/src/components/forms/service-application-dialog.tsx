"use client";

import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogClose } from "@/components/ui/dialog";
import { DynamicForm } from "./dynamic-form";
import { ProfessionalCoursesForm } from "./professional-courses-form";
import { IITNeetForm } from "./iit-neet-form";
import type { Service } from "@/lib/api/services/cms";

interface ServiceApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: Service;
}

// Legacy: Determine which hardcoded form to show based on service title/slug
function getFormType(service: Service): "professional" | "iit-neet" {
  const title = service.title.toLowerCase();
  const slug = service.slug.toLowerCase();

  if (
    title.includes("iit") ||
    title.includes("neet") ||
    title.includes("foundation") ||
    title.includes("test series") ||
    title.includes("doubt desk") ||
    slug.includes("iit") ||
    slug.includes("neet") ||
    slug.includes("foundation")
  ) {
    return "iit-neet";
  }

  return "professional";
}

export function ServiceApplicationDialog({ open, onOpenChange, service }: ServiceApplicationDialogProps) {
  const hasDynamicForm = !!service.formSchema;
  const formType = getFormType(service);

  const formTitle = hasDynamicForm
    ? service.formSchema!.title
    : formType === "iit-neet"
      ? "Candidate Application Form - IIT-JEE / NEET Programs"
      : "Candidate Application Form for Professional Courses";

  const formDescription = hasDynamicForm
    ? service.formSchema!.description
    : formType === "iit-neet"
      ? "Fill out the form below to apply for IIT-JEE or NEET programs. All fields marked with (*) are required."
      : "Fill out the form below to apply for professional courses. All fields marked with (*) are required.";

  const handleSuccess = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{formTitle}</DialogTitle>
        {formDescription && <DialogDescription>{formDescription}</DialogDescription>}
      </DialogHeader>
      <DialogClose onClose={() => onOpenChange(false)} />
      <DialogContent>
        {hasDynamicForm ? (
          <DynamicForm
            serviceId={service.serviceId}
            formSchema={service.formSchema!}
            onSuccess={handleSuccess}
          />
        ) : formType === "iit-neet" ? (
          <IITNeetForm serviceTitle={service.title} onSuccess={handleSuccess} />
        ) : (
          <ProfessionalCoursesForm serviceTitle={service.title} onSuccess={handleSuccess} />
        )}
      </DialogContent>
    </Dialog>
  );
}
