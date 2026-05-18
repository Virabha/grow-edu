"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUpdateCompany } from "../hooks/use-companies";
import { Company } from "../types";
const formSchema = z.object({
    name: z.string().min(1, "Company name is required"),
    email: z.string().email("Invalid email address").optional().or(z.literal("")),
    phone: z.string().optional(),
    address: z.string().optional(),
});
interface EditCompanyDialogProps {
    company: Company | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}
export function EditCompanyDialog({ company, open, onOpenChange }: EditCompanyDialogProps) {
    const updateCompany = useUpdateCompany();
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: company?.name || "",
            email: company?.email || "",
            phone: company?.phone || "",
            address: company?.address || "",
        },
        values: {
            name: company?.name || "",
            email: company?.email || "",
            phone: company?.phone || "",
            address: company?.address || "",
        },
    });
    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!company)
            return;
        try {
            await updateCompany.mutateAsync({
                id: company.id,
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
          <DialogTitle>Edit Company</DialogTitle>
          <DialogDescription>
            Update the company's information.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2.5">
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>)}/>
            <FormField control={form.control} name="email" render={({ field }) => (<FormItem>
                  <FormLabel>Contact Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>)}/>
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="phone" render={({ field }) => (<FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} type="tel"/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>)}/>
            </div>
             <FormField control={form.control} name="address" render={({ field }) => (<FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input {...field}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>)}/>
            <DialogFooter>
              <Button type="submit" disabled={updateCompany.isPending}>
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>);
}
