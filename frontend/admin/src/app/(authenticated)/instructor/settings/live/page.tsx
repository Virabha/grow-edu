"use client";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageLayout } from "@/components/layout/page-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FormField } from "@/components/ui/form-field";
import { getApiErrorMessage } from "@/lib/utils";
import {
  useMeetingCredentials,
  useUpsertZoom,
  useClearZoom,
  useUpsertJitsi,
  useClearJitsi,
} from "@/features/instructor/hooks/use-meeting-credentials";

// ── Zoom form ──────────────────────────────────────────────────────────────

const zoomSchema = z.object({
  clientId: z.string().min(1, "Client ID is required").max(255),
  clientSecret: z.string().max(1024).optional(),
});

type ZoomForm = z.infer<typeof zoomSchema>;

// ── Jitsi form ─────────────────────────────────────────────────────────────

const jitsiSchema = z.object({
  appId: z.string().min(1, "App ID is required").max(255),
  appKey: z.string().max(4096).optional(),
});

type JitsiForm = z.infer<typeof jitsiSchema>;

// ── Shared sub-components ─────────────────────────────────────────────────

function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
    >
      {children}
      {required && (
        <span className="ml-1 text-destructive" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

function SecretConfiguredBadge({ configured }: { configured: boolean }) {
  if (!configured) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
      <CheckCircle2 className="size-3.5" />
      Secret configured. Enter a new value to replace it.
    </p>
  );
}

// ── Zoom section ───────────────────────────────────────────────────────────

function ZoomSection({
  zoomClientId,
  zoomSecretConfigured,
}: {
  zoomClientId: string | null;
  zoomSecretConfigured: boolean;
}) {
  const upsert = useUpsertZoom();
  const clear = useClearZoom();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ZoomForm>({
    resolver: zodResolver(zoomSchema),
    defaultValues: { clientId: zoomClientId ?? "", clientSecret: "" },
    mode: "onBlur",
  });

  useEffect(() => {
    reset({ clientId: zoomClientId ?? "", clientSecret: "" });
  }, [zoomClientId, reset]);

  const onSubmit = async (values: ZoomForm) => {
    try {
      await upsert.mutateAsync({
        clientId: values.clientId,
        // Empty string means "leave unchanged" — omit to preserve stored secret
        clientSecret: values.clientSecret ?? "",
      });
      toast.success("Zoom credentials updated.");
      reset({ clientId: values.clientId, clientSecret: "" });
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to save Zoom credentials."));
    }
  };

  const handleClear = async () => {
    try {
      await clear.mutateAsync();
      toast.success("Zoom credentials cleared.");
      reset({ clientId: "", clientSecret: "" });
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to clear Zoom credentials."));
    }
  };

  const isWorking = isSubmitting || upsert.isPending || clear.isPending;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      {/* Form card */}
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Live meeting
        </p>
        <p className="font-display mt-1 text-xl font-medium text-foreground">
          Zoom Live Setting
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Your Zoom Meeting SDK credentials for launching live sessions.
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-5 space-y-4"
          noValidate
        >
          <FormField
            label="Client ID"
            required
            error={errors.clientId?.message}
          >
            <Controller
              control={control}
              name="clientId"
              render={({ field }) => (
                <Input
                  id="zoom-client-id"
                  {...field}
                  value={field.value}
                  placeholder="hOJEuTYiTAaT9xCTc"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={isWorking}
                />
              )}
            />
          </FormField>

          <div className="space-y-1">
            <FieldLabel htmlFor="zoom-client-secret" required>
              Client Secret
            </FieldLabel>
            <Controller
              control={control}
              name="clientSecret"
              render={({ field }) => (
                <Input
                  id="zoom-client-secret"
                  type="password"
                  {...field}
                  value={field.value ?? ""}
                  placeholder={
                    zoomSecretConfigured
                      ? "Enter new secret to replace"
                      : "Paste your client secret"
                  }
                  autoComplete="new-password"
                  spellCheck={false}
                  disabled={isWorking}
                />
              )}
            />
            <SecretConfiguredBadge configured={zoomSecretConfigured} />
            {errors.clientSecret && (
              <p className="text-xs text-destructive">
                {errors.clientSecret.message}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              type="submit"
              disabled={!isDirty || isWorking}
              className="gap-1.5"
            >
              {(isSubmitting || upsert.isPending) && (
                <Loader2 className="size-3.5 animate-spin" />
              )}
              Update
            </Button>
            {(zoomClientId !== null || zoomSecretConfigured) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isWorking}
                onClick={handleClear}
                className="gap-1.5 text-destructive hover:text-destructive"
              >
                {clear.isPending && (
                  <Loader2 className="size-3.5 animate-spin" />
                )}
                {!clear.isPending && <Trash2 className="size-3.5" />}
                Clear
              </Button>
            )}
          </div>
        </form>
      </section>

      {/* Help panel */}
      <aside className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-5">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
          How to build a Zoom Meeting SDK?
        </p>
        <ol className="mt-3 space-y-2.5 text-xs text-amber-800 dark:text-amber-200">
          <li>
            <span className="font-medium">1.</span> Log in to the{" "}
            <a
              href="https://marketplace.zoom.us/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 inline-flex items-center gap-0.5 hover:text-amber-900 dark:hover:text-amber-50"
            >
              Zoom Marketplace
              <ExternalLink className="size-3" />
            </a>
          </li>
          <li>
            <span className="font-medium">2.</span> Navigate to the{" "}
            <span className="font-medium">Build Legacy App</span> section.
            You&apos;ll see a list of available app types.
          </li>
          <li>
            <span className="font-medium">3.</span> In the{" "}
            <span className="font-medium">Meeting SDK</span> section, click{" "}
            <span className="font-medium">Create</span>.
          </li>
          <li>
            <span className="font-medium">4.</span> Add a name for your app and
            click <span className="font-medium">Create</span>.
          </li>
          <li>
            <span className="font-medium">5.</span> View your{" "}
            <span className="font-medium">client ID</span> and{" "}
            <span className="font-medium">client secret</span>. These
            credentials will be used in this section.
          </li>
        </ol>
      </aside>
    </div>
  );
}

// ── Jitsi section ──────────────────────────────────────────────────────────

function JitsiSection({
  jitsiAppId,
  jitsiSecretConfigured,
}: {
  jitsiAppId: string | null;
  jitsiSecretConfigured: boolean;
}) {
  const upsert = useUpsertJitsi();
  const clear = useClearJitsi();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<JitsiForm>({
    resolver: zodResolver(jitsiSchema),
    defaultValues: { appId: jitsiAppId ?? "", appKey: "" },
    mode: "onBlur",
  });

  useEffect(() => {
    reset({ appId: jitsiAppId ?? "", appKey: "" });
  }, [jitsiAppId, reset]);

  const onSubmit = async (values: JitsiForm) => {
    try {
      await upsert.mutateAsync({
        appId: values.appId,
        appKey: values.appKey ?? "",
      });
      toast.success("Jitsi credentials updated.");
      reset({ appId: values.appId, appKey: "" });
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to save Jitsi credentials."));
    }
  };

  const handleClear = async () => {
    try {
      await clear.mutateAsync();
      toast.success("Jitsi credentials cleared.");
      reset({ appId: "", appKey: "" });
    } catch (err) {
      toast.error(
        getApiErrorMessage(err, "Failed to clear Jitsi credentials."),
      );
    }
  };

  const isWorking = isSubmitting || upsert.isPending || clear.isPending;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      {/* Form card */}
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Live meeting
        </p>
        <p className="font-display mt-1 text-xl font-medium text-foreground">
          Jitsi Setting
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Your Jitsi as a Service (JaaS) credentials for launching live
          sessions.
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-5 space-y-4"
          noValidate
        >
          <FormField label="App ID" required error={errors.appId?.message}>
            <Controller
              control={control}
              name="appId"
              render={({ field }) => (
                <Input
                  id="jitsi-app-id"
                  {...field}
                  value={field.value}
                  placeholder="vpaas-magic-cookie-abc123"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={isWorking}
                />
              )}
            />
          </FormField>

          <div className="space-y-1">
            <FieldLabel htmlFor="jitsi-app-key" required>
              App Key
            </FieldLabel>
            <Controller
              control={control}
              name="appKey"
              render={({ field }) => (
                <Input
                  id="jitsi-app-key"
                  type="password"
                  {...field}
                  value={field.value ?? ""}
                  placeholder={
                    jitsiSecretConfigured
                      ? "Enter new key to replace"
                      : "Paste your API key"
                  }
                  autoComplete="new-password"
                  spellCheck={false}
                  disabled={isWorking}
                />
              )}
            />
            <SecretConfiguredBadge configured={jitsiSecretConfigured} />
            {errors.appKey && (
              <p className="text-xs text-destructive">{errors.appKey.message}</p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              type="submit"
              disabled={!isDirty || isWorking}
              className="gap-1.5"
            >
              {(isSubmitting || upsert.isPending) && (
                <Loader2 className="size-3.5 animate-spin" />
              )}
              Update
            </Button>
            {(jitsiAppId !== null || jitsiSecretConfigured) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isWorking}
                onClick={handleClear}
                className="gap-1.5 text-destructive hover:text-destructive"
              >
                {clear.isPending && (
                  <Loader2 className="size-3.5 animate-spin" />
                )}
                {!clear.isPending && <Trash2 className="size-3.5" />}
                Clear
              </Button>
            )}
          </div>
        </form>
      </section>

      {/* Help panel */}
      <aside className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-5">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
          How do I obtain Jitsi credentials?
        </p>
        <ol className="mt-3 space-y-2.5 text-xs text-amber-800 dark:text-amber-200">
          <li>
            <span className="font-medium">1.</span> Log in to{" "}
            <a
              href="https://jaas.8x8.vc/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 inline-flex items-center gap-0.5 hover:text-amber-900 dark:hover:text-amber-50"
            >
              Jitsi as a Service
              <ExternalLink className="size-3" />
            </a>
          </li>
          <li>
            <span className="font-medium">2.</span> Navigate to the{" "}
            <span className="font-medium">API keys</span> section, where
            you&apos;ll see your App ID and a list of API keys.
          </li>
          <li>
            <span className="font-medium">3.</span> Click the{" "}
            <span className="font-medium">&quot;Add API Key&quot;</span> button.
          </li>
          <li>
            <span className="font-medium">4.</span> Click the{" "}
            <span className="font-medium">
              &quot;Generate API Key Pair&quot;
            </span>{" "}
            button.
          </li>
          <li>
            <span className="font-medium">5.</span> Copy the generated{" "}
            <span className="font-medium">App Key</span> and paste it above.
          </li>
        </ol>
      </aside>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function InstructorLiveSettingsPage() {
  const { data, isLoading, error, refetch } = useMeetingCredentials();

  if (isLoading) {
    return (
      <PageLayout
        subtitle="Settings"
        header="Live Meeting Settings"
        description="Configure your Zoom and Jitsi credentials for live sessions."
      >
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout
        subtitle="Settings"
        header="Live Meeting Settings"
        description="Configure your Zoom and Jitsi credentials for live sessions."
      >
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive">
            {getApiErrorMessage(error, "Failed to load credentials.")}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => void refetch()}
          >
            Retry
          </Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      subtitle="Settings"
      header="Live Meeting Settings"
      description="Configure your Zoom and Jitsi credentials for live sessions."
    >
      <ZoomSection
        zoomClientId={data?.zoomClientId ?? null}
        zoomSecretConfigured={data?.zoomSecretConfigured ?? false}
      />
      <JitsiSection
        jitsiAppId={data?.jitsiAppId ?? null}
        jitsiSecretConfigured={data?.jitsiSecretConfigured ?? false}
      />
    </PageLayout>
  );
}
