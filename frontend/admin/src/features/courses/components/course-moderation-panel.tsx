"use client";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { AlertCircle, CheckCircle, Loader2, XCircle } from "lucide-react";
import { getApiError } from "@/lib/api/errors";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useApproveCourse,
  useRejectCourse,
  useRequestCourseChanges,
} from "@/features/courses/hooks/use-courses";

const approveSchema = z.object({
  reviewNotes: z.string().optional(),
});

const rejectSchema = z.object({
  rejectionReason: z.string().min(1, "Rejection reason is required"),
});

const changesSchema = z.object({
  reviewNotes: z.string().min(1, "Provide feedback for the instructor"),
});

interface CourseModerationPanelProps {
  courseId: string;
}

export function CourseModerationPanel({ courseId }: CourseModerationPanelProps) {
  const router = useRouter();
  const approveMutation = useApproveCourse();
  const rejectMutation = useRejectCourse();
  const requestChangesMutation = useRequestCourseChanges();

  const approveForm = useForm({
    resolver: zodResolver(approveSchema),
    defaultValues: { reviewNotes: "" },
  });
  const changesForm = useForm({
    resolver: zodResolver(changesSchema),
    defaultValues: { reviewNotes: "" },
  });
  const rejectForm = useForm({
    resolver: zodResolver(rejectSchema),
    defaultValues: { rejectionReason: "" },
  });

  const onApprove = async (data: z.infer<typeof approveSchema>) => {
    try {
      await approveMutation.mutateAsync({
        id: courseId,
        notes: data.reviewNotes,
        publish: true,
      });
      toast.success("Course approved.");
      router.push("/admin/courses");
    } catch (err) {
      toast.error(getApiError(err, "Something went wrong.").message);
    }
  };

  const onRequestChanges = async (data: z.infer<typeof changesSchema>) => {
    try {
      await requestChangesMutation.mutateAsync({
        id: courseId,
        notes: data.reviewNotes,
      });
      toast.success("Changes requested.");
      router.push("/admin/courses");
    } catch (err) {
      toast.error(getApiError(err, "Something went wrong.").message);
    }
  };

  const onReject = async (data: z.infer<typeof rejectSchema>) => {
    try {
      await rejectMutation.mutateAsync({
        id: courseId,
        reason: data.rejectionReason,
      });
      toast.success("Course rejected.");
      router.push("/admin/courses");
    } catch (err) {
      toast.error(getApiError(err, "Something went wrong.").message);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Moderation
      </p>
      <Tabs defaultValue="approve" className="mt-3 w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="approve" className="gap-1 text-xs">
            <CheckCircle className="size-3.5" />
            <span className="hidden sm:inline">Approve</span>
          </TabsTrigger>
          <TabsTrigger value="changes" className="gap-1 text-xs">
            <AlertCircle className="size-3.5" />
            <span className="hidden sm:inline">Changes</span>
          </TabsTrigger>
          <TabsTrigger value="reject" className="gap-1 text-xs">
            <XCircle className="size-3.5" />
            <span className="hidden sm:inline">Reject</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="approve" className="space-y-3 pt-4">
          <p className="text-xs text-muted-foreground">
            Approve & publish this course for learners.
          </p>
          <Form {...approveForm}>
            <FormField
              control={approveForm.control}
              name="reviewNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Internal notes (optional)
                  </FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} placeholder="—" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              className="w-full gap-1.5"
              onClick={approveForm.handleSubmit(onApprove)}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending && (
                <Loader2 className="size-3.5 animate-spin" />
              )}
              <CheckCircle className="size-4" />
              Approve & publish
            </Button>
          </Form>
        </TabsContent>

        <TabsContent value="changes" className="space-y-3 pt-4">
          <p className="text-xs text-muted-foreground">
            Request changes from the instructor.
          </p>
          <Form {...changesForm}>
            <FormField
              control={changesForm.control}
              name="reviewNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Feedback for instructor
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={3}
                      placeholder="What needs to be fixed?"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              variant="secondary"
              className="w-full gap-1.5"
              onClick={changesForm.handleSubmit(onRequestChanges)}
              disabled={requestChangesMutation.isPending}
            >
              {requestChangesMutation.isPending && (
                <Loader2 className="size-3.5 animate-spin" />
              )}
              <AlertCircle className="size-4" />
              Request changes
            </Button>
          </Form>
        </TabsContent>

        <TabsContent value="reject" className="space-y-3 pt-4">
          <p className="text-xs text-muted-foreground">
            Reject this course permanently. The instructor can&apos;t resubmit.
          </p>
          <Form {...rejectForm}>
            <FormField
              control={rejectForm.control}
              name="rejectionReason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Rejection reason
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={3}
                      placeholder="Why is this rejected?"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              variant="destructive"
              className="w-full gap-1.5"
              onClick={rejectForm.handleSubmit(onReject)}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending && (
                <Loader2 className="size-3.5 animate-spin" />
              )}
              <XCircle className="size-4" />
              Reject course
            </Button>
          </Form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
