"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useUpdateEnrollmentStatus } from "../hooks/use-enrollments";
import { Enrollment } from "../types";
const formSchema = z.object({
    status: z.enum(["ACTIVE", "COMPLETED", "REVOKED"]),
});
interface EditEnrollmentDialogProps {
    enrollment: Enrollment | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}
export function EditEnrollmentDialog({ enrollment, open, onOpenChange }: EditEnrollmentDialogProps) {
    const updateEnrollmentStatus = useUpdateEnrollmentStatus();
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            status: enrollment?.status as "ACTIVE" | "COMPLETED" | "REVOKED" || "ACTIVE",
        },
        values: {
            status: enrollment?.status as "ACTIVE" | "COMPLETED" | "REVOKED" || "ACTIVE",
        },
    });
    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!enrollment)
            return;
        try {
            await updateEnrollmentStatus.mutateAsync({
                enrollmentId: enrollment.enrollmentId,
                status: values.status,
            });
            onOpenChange(false);
        }
        catch (error) {
        }
    };
    return (<Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Enrollment</DialogTitle>
          <DialogDescription>
            Update status for {enrollment?.user?.email}'s enrollment in {enrollment?.course?.title}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2.5">
            <FormField control={form.control} name="status" render={({ field }) => (<FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a status"/>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="REVOKED">Revoked</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>)}/>
            <DialogFooter>
              <Button type="submit" disabled={updateEnrollmentStatus.isPending}>
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>);
}
