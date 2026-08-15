"use client";

import * as React from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api/client";
import { getApiError } from "@/lib/api/errors";

export default function ClearDatabasePage() {
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = React.useState("");

  const reset = useMutation({
    mutationFn: () =>
      apiClient
        .post<{ message: string }>("/system/clear-database", { confirm })
        .then((r) => r.data),
    onSuccess: (result) => {
      queryClient.clear();
      toast.success(result.message);
      setConfirm("");
    },
    onError: (err) =>
      toast.error(getApiError(err, "Could not reset").message),
  });

  return (
    <PageLayout
      subtitle="Maintenance"
      header="Reset demo data"
      description="Put every record back to the state it shipped in."
    >
      <Card className="max-w-2xl border-destructive/40">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            This cannot be undone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Every course, user, order, blog post and setting returns to its seeded
            value. Anything you created or edited during the demo is discarded.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="confirm">
              Type <code className="rounded bg-muted px-1 font-mono">DELETE</code> to confirm
            </Label>
            <Input
              id="confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="DELETE"
              className="max-w-xs font-mono"
              autoComplete="off"
            />
          </div>

          <Button
            variant="destructive"
            disabled={confirm !== "DELETE" || reset.isPending}
            onClick={() => reset.mutate()}
          >
            <RotateCcw className="mr-1.5 h-4 w-4" />
            {reset.isPending ? "Resetting…" : "Reset all demo data"}
          </Button>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
