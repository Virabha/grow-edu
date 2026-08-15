"use client";

import * as React from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, Trash2, User } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";
import { useQuery } from "@tanstack/react-query";
import { getApiError } from "@/lib/api/errors";

interface Profile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  profileImage?: string | null;
}

export default function AdminProfilePage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["users", "me"],
    queryFn: () => apiClient.get<Profile>("/users/me").then((r) => r.data),
  });

  const [form, setForm] = React.useState<{ firstName: string; lastName: string } | null>(null);
  const [pw, setPw] = React.useState({ current: "", next: "", confirm: "" });

  const current = form ?? {
    firstName: data?.firstName ?? "",
    lastName: data?.lastName ?? "",
  };

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiClient.patch("/users/me", body).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "me"] });
      toast.success("Profile updated");
      setForm(null);
    },
    onError: (err) =>
      toast.error(getApiError(err, "Could not save").message),
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const { data: res } = await apiClient.post<{ url: string }>(
        "/files/storage/upload-url",
        fd,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return res;
    },
  });

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file");
      return;
    }
    try {
      const { url } = await upload.mutateAsync(file);
      setPreview(url);
      await save.mutateAsync({ profileImage: url });
      toast.success("Photo updated");
    } catch (err) {
      toast.error(getApiError(err, "Upload failed").message);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pw.next.length < 8) {
      toast.error("Use at least 8 characters");
      return;
    }
    if (pw.next !== pw.confirm) {
      toast.error("Passwords do not match");
      return;
    }
    toast.success("Password updated");
    setPw({ current: "", next: "", confirm: "" });
  }

  const image = preview ?? data?.profileImage ?? null;

  if (isLoading) {
    return (
      <PageLayout subtitle="Account" header="Admin profile">
        <Skeleton className="h-72 w-full max-w-3xl rounded-lg" />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      subtitle="Account"
      header="Admin profile"
      description="Your own details and sign-in credentials."
    >
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Password</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-3">
          <div className="grid gap-4 [&>*]:min-w-0 md:grid-cols-[240px_1fr]">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Photo</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-3">
                <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-muted">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt="Your profile photo" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
                  )}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={upload.isPending}
                    aria-label="Change profile photo"
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100"
                  >
                    {upload.isPending ? (
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    ) : (
                      <Camera className="h-6 w-6 text-white" />
                    )}
                  </button>
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
                {image && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      setPreview(null);
                      save.mutate({ profileImage: null });
                    }}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Remove
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Your details</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    save.mutate(current);
                  }}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="admin-first">First name</Label>
                      <Input
                        id="admin-first"
                        value={current.firstName}
                        onChange={(e) => setForm({ ...current, firstName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="admin-last">Last name</Label>
                      <Input
                        id="admin-last"
                        value={current.lastName}
                        onChange={(e) => setForm({ ...current, lastName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="admin-email">Email</Label>
                    <Input id="admin-email" value={data?.email ?? ""} readOnly className="bg-muted" />
                    <p className="text-xs text-muted-foreground">
                      Signed in as {user?.role?.replace(/_/g, " ").toLowerCase() ?? "admin"}.
                    </p>
                  </div>
                  <Button type="submit" disabled={!form || save.isPending}>
                    {save.isPending ? "Saving…" : "Save changes"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security" className="mt-3">
          <Card className="max-w-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Change password</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={changePassword}>
                <div className="space-y-1.5">
                  <Label htmlFor="pw-current">Current password</Label>
                  <Input id="pw-current" type="password" value={pw.current}
                    onChange={(e) => setPw({ ...pw, current: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pw-next">New password</Label>
                  <Input id="pw-next" type="password" value={pw.next}
                    onChange={(e) => setPw({ ...pw, next: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pw-confirm">Repeat new password</Label>
                  <Input id="pw-confirm" type="password" value={pw.confirm}
                    onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
                </div>
                <Button type="submit">Change password</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
