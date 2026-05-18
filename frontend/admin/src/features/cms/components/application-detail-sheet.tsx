"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useServiceApplicationById, useUpdateApplicationStatus } from "../hooks/use-cms";
import type { ApplicationStatus, FormSchema, FormField } from "../types";
import { useState, useEffect } from "react";

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "REVIEWED", label: "Reviewed" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
];

function getStatusVariant(status: ApplicationStatus) {
  switch (status) {
    case "NEW": return "secondary" as const;
    case "REVIEWED": return "outline" as const;
    case "CONTACTED": return "default" as const;
    case "ACCEPTED": return "default" as const;
    case "REJECTED": return "destructive" as const;
    default: return "secondary" as const;
  }
}

function getFieldLabel(formSchema: FormSchema | null | undefined, fieldName: string): string {
  if (!formSchema) return fieldName;
  for (const section of formSchema.sections) {
    const field = section.fields.find((f) => f.name === fieldName);
    if (field) return field.label;
  }
  return fieldName;
}

export function ApplicationDetailSheet({
  open,
  onOpenChange,
  applicationId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string | null;
}) {
  const { data: application, isLoading } = useServiceApplicationById(applicationId, open);
  const updateStatus = useUpdateApplicationStatus();
  const [status, setStatus] = useState<ApplicationStatus>("NEW");
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    if (application) {
      setStatus(application.status);
      setAdminNotes(application.adminNotes ?? "");
    }
  }, [application]);

  function handleUpdateStatus() {
    if (!applicationId) return;
    updateStatus.mutate(
      { id: applicationId, status, adminNotes: adminNotes.trim() || undefined },
      { onSuccess: () => onOpenChange(false) }
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle>Application Detail</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 px-6 py-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-4 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : application ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-lg">{application.applicantName}</p>
                  <p className="text-sm text-muted-foreground">{application.applicantEmail}</p>
                  {application.applicantPhone && (
                    <p className="text-sm text-muted-foreground">{application.applicantPhone}</p>
                  )}
                </div>
                <Badge variant={getStatusVariant(application.status)}>{application.status}</Badge>
              </div>

              <div className="text-sm text-muted-foreground">
                <span>Service: </span>
                <span className="font-medium text-foreground">{application.serviceTitle ?? "Unknown"}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                <span>Submitted: </span>
                <span>{new Date(application.createdAt).toLocaleString()}</span>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Form Responses</h4>
                {Object.entries(application.formData as Record<string, unknown>).map(([key, value]) => (
                  <div key={key} className="space-y-0.5">
                    <Label className="text-xs text-muted-foreground">
                      {getFieldLabel(application.formSchema as FormSchema | null, key)}
                    </Label>
                    <p className="text-sm">{String(value ?? "-")}</p>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Update Status</h4>
                <Select value={status} onValueChange={(v) => setStatus(v as ApplicationStatus)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div>
                  <Label className="text-xs">Admin Notes</Label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                    placeholder="Internal notes..."
                    className="text-sm"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleUpdateStatus}
                  disabled={updateStatus.isPending}
                  className="w-full"
                >
                  {updateStatus.isPending ? "Saving..." : "Update Status"}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Application not found.</p>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
