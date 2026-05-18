"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUpdateUser } from "../hooks/use-users";
import type { User } from "../types";

const roleValues = ["LEARNER", "INSTRUCTOR", "CORPORATE_ADMIN", "PLATFORM_ADMIN"] as const;
type Role = (typeof roleValues)[number];

const formSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    role: z.enum(roleValues),
});
interface EditUserDialogProps {
    user: User | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}
export function EditUserDialog({ user, open, onOpenChange }: EditUserDialogProps) {
    const updateUser = useUpdateUser();
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            firstName: user?.firstName || "",
            lastName: user?.lastName || "",
            role: (user?.role as Role) || "LEARNER",
        },
        values: {
            firstName: user?.firstName || "",
            lastName: user?.lastName || "",
            role: (user?.role as Role) || "LEARNER",
        }
    });
    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!user)
            return;
        try {
            await updateUser.mutateAsync({
                id: user.id,
                data: values,
            });
            onOpenChange(false);
        }
        catch (error) {
        }
    };
    return (<Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Make changes to the user's profile and role here.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2.5">
            <FormField control={form.control} name="firstName" render={({ field }) => (<FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input {...field}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>)}/>
            <FormField control={form.control} name="lastName" render={({ field }) => (<FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input {...field}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>)}/>
            <FormField control={form.control} name="role" render={({ field }) => (<FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role"/>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="LEARNER">Learner</SelectItem>
                      <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
                      <SelectItem value="CORPORATE_ADMIN">Corporate Admin</SelectItem>
                      <SelectItem value="PLATFORM_ADMIN">Platform Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>)}/>
            <DialogFooter>
              <Button type="submit" disabled={updateUser.isPending}>
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>);
}
