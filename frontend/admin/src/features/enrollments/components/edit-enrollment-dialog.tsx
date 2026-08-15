"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { FieldPath } from "react-hook-form";
import { getApiError } from "@/lib/api/errors";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useUpdateEnrollmentStatus } from "../hooks/use-enrollments";
import { Enrollment } from "../types";

const statusValues = ["ACTIVE", "COMPLETED", "REVOKED"] as const;
type Status = (typeof statusValues)[number];

const formSchema = z.object({
  status: z.enum(statusValues),
});

interface EditEnrollmentDialogProps {
  enrollment: Enrollment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditEnrollmentDialog({
  enrollment,
  open,
  onOpenChange,
}: EditEnrollmentDialogProps) {
  const updateEnrollmentStatus = useUpdateEnrollmentStatus();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    values: {
      status: (enrollment?.status as Status) || "ACTIVE",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!enrollment) return;
    try {
      await updateEnrollmentStatus.mutateAsync({
        enrollmentId: enrollment.enrollmentId,
        status: values.status,
      });
      onOpenChange(false);
    } catch (err) {
      const apiError = getApiError(err);
      for (const [field, message] of Object.entries(apiError.fieldErrors)) {
        form.setError(field as FieldPath<z.infer<typeof formSchema>>, { type: "server", message });
      }
      if (Object.keys(apiError.fieldErrors).length === 0) {
        toast.error(apiError.message);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage enrolment</DialogTitle>
          <DialogDescription>
            {enrollment?.user?.email} · {enrollment?.course?.title}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="REVOKED">Revoked</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={updateEnrollmentStatus.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateEnrollmentStatus.isPending}
                className="gap-1.5"
              >
                {updateEnrollmentStatus.isPending && (
                  <Loader2 className="size-3.5 animate-spin" />
                )}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
