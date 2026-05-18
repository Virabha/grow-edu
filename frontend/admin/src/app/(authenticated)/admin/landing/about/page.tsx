"use client";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent } from "@/components/ui/card";
import { AboutSettingsForm } from "@/features/cms/components/about-settings-form";

export default function AdminAboutPage() {
  return (
    <PageLayout header="About Us" description="Edit about content via site settings (JSON).">
      <Card>
        <CardContent className="pt-2">
          <AboutSettingsForm />
        </CardContent>
      </Card>
    </PageLayout>
  );
}
