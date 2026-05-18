"use client";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from "@/components/ui/card";
import { useCompany } from "@/features/companies/hooks/use-companies";
import { useAuthStore } from "@/lib/store/auth-store";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { useUpdateCompany } from "@/features/companies/hooks/use-companies";
const companySchema = z.object({
    name: z.string().min(1, "Company name is required"),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional(),
    address: z.string().optional(),
});
type CompanyFormData = z.infer<typeof companySchema>;
export default function CorporateSettingsPage() {
    const { user } = useAuthStore();
    const { data: company, isLoading } = useCompany({
        enabled: true,
        id: user?.companyId ?? undefined,
    });
    const updateCompany = useUpdateCompany();
    const { register, handleSubmit, formState: { errors }, reset, } = useForm<CompanyFormData>({
        resolver: zodResolver(companySchema),
    });
    useEffect(() => {
        const companyData = company;
        if (companyData) {
            reset({
                name: companyData.name || "",
                email: companyData.email || "",
                phone: companyData.phone || "",
                address: companyData.address || "",
            });
        }
    }, [company, reset]);
    const onSubmit = (data: CompanyFormData) => {
        const companyId = user?.companyId ?? undefined;
        if (companyId) {
            updateCompany.mutate({
                id: companyId,
                data: data,
            });
        }
    };
    if (isLoading) {
        return (<PageLayout header="Loading...">
        <Skeleton className="h-64 w-full"/>
      </PageLayout>);
    }
    return (<PageLayout header="Corporate Settings" subtitle="Company" description="Manage your company account information and preferences.">
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
          <CardDescription>Update your company details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-2.5">
            <FormField label="Company Name" required error={errors.name?.message} description="Your company's official name">
              <Input id="name" {...register("name")} placeholder="Enter company name"/>
            </FormField>
            <FormField label="Email" error={errors.email?.message} description="Company contact email address">
              <Input id="email" type="email" {...register("email")} placeholder="company@example.com"/>
            </FormField>
            <FormField label="Phone" description="Company contact phone number">
              <Input id="phone" {...register("phone")} placeholder="+1 234 567 8900"/>
            </FormField>
            <FormField label="Address" description="Company headquarters address">
              <Input id="address" {...register("address")} placeholder="Company address"/>
            </FormField>
            <Button type="submit" disabled={updateCompany.isPending}>
              {updateCompany.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </PageLayout>);
}
