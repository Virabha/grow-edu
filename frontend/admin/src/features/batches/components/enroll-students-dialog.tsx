"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAddBatchEnrollments } from "../hooks/use-batches";

export function EnrollStudentsDialog(props: {
  batchId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { batchId, open, onOpenChange } = props;
  const [raw, setRaw] = useState("");
  const add = useAddBatchEnrollments(batchId);

  function close() {
    setRaw("");
    onOpenChange(false);
  }

  async function handleSubmit() {
    const emails = raw
      .split(/[\s,;\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.includes("@"));
    if (emails.length === 0) {
      toast.error("Add at least one email address");
      return;
    }
    try {
      const res = await add.mutateAsync({ emails });
      toast.success(
        `Enrolled ${res.enrolled}. Already-enrolled: ${res.alreadyEnrolled}. Not found: ${res.notFoundEmails.length}.`
      );
      if (res.notFoundEmails.length > 0) {
        toast.warning(`Not found: ${res.notFoundEmails.join(", ")}`);
      }
      close();
    } catch {
      toast.error("Failed to enroll students");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enroll students</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="emails">Email addresses</Label>
          <Textarea
            id="emails"
            rows={6}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={"student1@example.com\nstudent2@example.com\n…"}
          />
          <p className="text-xs text-muted-foreground">
            Paste any combination separated by commas, semicolons, or newlines.
            Users must already have an account; unknown emails are reported back.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={add.isPending}>
            Enroll
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
