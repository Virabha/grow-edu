"use client";

import * as React from "react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QrCode, RotateCcw } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api/client";
import { getApiError } from "@/lib/api/errors";

interface Template {
  backgroundUrl: string;
  signatureUrl: string;
  signatoryName: string;
  signatoryTitle: string;
  bodyText: string;
  showQrCode: boolean;
  showCertificateId: boolean;
  accentColour: string;
}

const SAMPLE = {
  learner_name: "Ananya Rao",
  course_title: "UPSC Prelims: Complete General Studies",
  completion_date: "14 August 2026",
};

export default function CertificateBuilderPage() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = React.useState<Template | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["certificate-template"],
    queryFn: () =>
      apiClient.get<Template>("/certificate-template").then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: (body: Template) =>
      apiClient.put("/certificate-template", body).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificate-template"] });
      toast.success("Certificate template saved");
      setDraft(null);
    },
    onError: (err) =>
      toast.error(getApiError(err, "Could not save").message),
  });

  const current = draft ?? data ?? null;
  const dirty = draft !== null;

  function set<K extends keyof Template>(key: K, value: Template[K]) {
    if (!current) return;
    setDraft({ ...current, [key]: value });
  }

  if (isLoading || !current) {
    return (
      <PageLayout subtitle="Courses" header="Certificate builder">
        <div className="grid gap-4 xl:grid-cols-2">
          <Skeleton className="h-[440px] w-full rounded-lg" />
          <Skeleton className="h-[440px] w-full rounded-lg" />
        </div>
      </PageLayout>
    );
  }

  const rendered = current.bodyText
    .replace("{{learner_name}}", SAMPLE.learner_name)
    .replace("{{course_title}}", SAMPLE.course_title)
    .replace("{{completion_date}}", SAMPLE.completion_date);

  return (
    <PageLayout
      subtitle="Courses"
      header="Certificate builder"
      description="The certificate issued when a learner completes a course. The preview updates as you type."
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={!dirty || save.isPending}
            onClick={() => setDraft(null)}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Discard
          </Button>
          <Button
            size="sm"
            disabled={!dirty || save.isPending}
            onClick={() => save.mutate(current)}
          >
            {save.isPending ? "Saving…" : "Save template"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 [&>*]:min-w-0 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cert-body">Certificate text</Label>
              <Textarea
                id="cert-body"
                rows={4}
                value={current.bodyText}
                onChange={(e) => set("bodyText", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Placeholders:{" "}
                <code className="rounded bg-muted px-1">{"{{learner_name}}"}</code>{" "}
                <code className="rounded bg-muted px-1">{"{{course_title}}"}</code>{" "}
                <code className="rounded bg-muted px-1">{"{{completion_date}}"}</code>
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cert-signatory">Signatory name</Label>
                <Input
                  id="cert-signatory"
                  value={current.signatoryName}
                  onChange={(e) => set("signatoryName", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cert-title">Signatory title</Label>
                <Input
                  id="cert-title"
                  value={current.signatoryTitle}
                  onChange={(e) => set("signatoryTitle", e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cert-bg">Background image URL</Label>
                <Input
                  id="cert-bg"
                  value={current.backgroundUrl}
                  onChange={(e) => set("backgroundUrl", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cert-accent">Accent colour</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="cert-accent"
                    type="color"
                    value={current.accentColour}
                    onChange={(e) => set("accentColour", e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent p-1"
                  />
                  <Input
                    value={current.accentColour}
                    onChange={(e) => set("accentColour", e.target.value)}
                    className="font-mono text-sm"
                    aria-label="Accent colour hex value"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <div>
                <Label htmlFor="cert-qr" className="text-sm">
                  Show verification QR code
                </Label>
                <p className="text-xs text-muted-foreground">
                  Links to a public page confirming the certificate is genuine.
                </p>
              </div>
              <Switch
                id="cert-qr"
                checked={current.showQrCode}
                onCheckedChange={(v) => set("showQrCode", v)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <Label htmlFor="cert-id" className="text-sm">
                Print the certificate id
              </Label>
              <Switch
                id="cert-id"
                checked={current.showCertificateId}
                onCheckedChange={(v) => set("showCertificateId", v)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="relative overflow-hidden rounded-lg border-2 bg-white p-6 text-center shadow-sm"
              style={{ borderColor: current.accentColour, aspectRatio: "297 / 210" }}
            >
              <div
                className="pointer-events-none absolute inset-2 rounded border"
                style={{ borderColor: `${current.accentColour}55` }}
                aria-hidden="true"
              />

              <div className="relative flex h-full flex-col items-center justify-between py-2">
                <div>
                  <p
                    className="text-[10px] font-semibold uppercase tracking-[0.3em]"
                    style={{ color: current.accentColour }}
                  >
                    Certificate of completion
                  </p>
                  <p className="mt-0.5 text-[11px] text-neutral-500">grotutor</p>
                </div>

                <p className="max-w-md text-sm leading-relaxed text-neutral-800">
                  {rendered}
                </p>

                <div className="flex w-full items-end justify-between gap-4 px-2">
                  <div className="text-left">
                    <div
                      className="mb-1 h-6 w-24 rounded-sm"
                      style={{ backgroundColor: `${current.accentColour}22` }}
                      aria-hidden="true"
                    />
                    <div
                      className="w-28 border-t pt-1"
                      style={{ borderColor: current.accentColour }}
                    >
                      <p className="text-[10px] font-medium text-neutral-800">
                        {current.signatoryName}
                      </p>
                      <p className="text-[9px] text-neutral-500">
                        {current.signatoryTitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-end gap-3">
                    {current.showCertificateId && (
                      <p className="font-mono text-[9px] text-neutral-500">
                        GT-CERT-2026-004821
                      </p>
                    )}
                    {current.showQrCode && (
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded border"
                        style={{ borderColor: `${current.accentColour}55` }}
                      >
                        <QrCode
                          className="h-8 w-8"
                          style={{ color: current.accentColour }}
                          aria-label="Verification QR code"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              Preview uses sample data. The real certificate substitutes the
              learner, course and completion date at issue time.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
