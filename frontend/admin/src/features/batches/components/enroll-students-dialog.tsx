"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Users } from "lucide-react";
import { Label } from "@/components/ui/label";
import { FormSheet } from "@/components/ui/form-sheet";
import {
  AsyncMultiSelect,
  type AsyncMultiSelectOption,
} from "@/components/ui/async-multi-select";
import { usersApi } from "@/features/users/api/users.api";
import { useAddBatchEnrollments } from "../hooks/use-batches";

const LABEL_CLS = "text-xs font-medium";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface SelectedStudent extends AsyncMultiSelectOption {
  userId?: string;
  email?: string;
}

export function EnrollStudentsDialog(props: {
  batchId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { batchId, open, onOpenChange } = props;
  const [selected, setSelected] = useState<SelectedStudent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const addEnrollments = useAddBatchEnrollments(batchId);

  useEffect(() => {
    if (!open) {
      setSelected([]);
      setError(null);
    }
  }, [open]);

  const loadOptions = useCallback(
    async (query: string): Promise<AsyncMultiSelectOption[]> => {
      try {
        const res = await usersApi.getAll({
          search: query || undefined,
          role: "LEARNER",
          limit: 20,
          page: 1,
        });
        return res.data.map((user) => {
          const name =
            [user.firstName, user.lastName].filter(Boolean).join(" ") ||
            user.email;
          const opt: SelectedStudent = {
            value: `user:${user.id}`,
            label: name,
            secondary: user.email,
            userId: user.id,
          };
          return opt;
        });
      } catch {
        return [];
      }
    },
    [],
  );

  const allowAdHoc = useCallback(
    (q: string): AsyncMultiSelectOption | null => {
      if (!EMAIL_RE.test(q)) return null;
      const opt: SelectedStudent = {
        value: `email:${q.toLowerCase()}`,
        label: q,
        secondary: "Invite by email",
        email: q.toLowerCase(),
      };
      return opt;
    },
    [],
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (selected.length === 0) {
      setError("Pick at least one student");
      return;
    }
    const userIds = selected
      .map((s) => s.userId)
      .filter((u): u is string => !!u);
    const emails = selected
      .map((s) => s.email)
      .filter((e): e is string => !!e);
    try {
      const res = await addEnrollments.mutateAsync({
        userIds: userIds.length > 0 ? userIds : undefined,
        emails: emails.length > 0 ? emails : undefined,
      });
      toast.success(
        `${res.enrolled} enrolled · ${res.alreadyEnrolled} already-in${
          res.notFoundEmails.length > 0
            ? ` · ${res.notFoundEmails.length} not found`
            : ""
        }`,
      );
      if (res.notFoundEmails.length > 0) {
        toast.warning(
          `Not found: ${res.notFoundEmails.slice(0, 5).join(", ")}${
            res.notFoundEmails.length > 5 ? "…" : ""
          }`,
        );
      }
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to enroll";
      setError(msg);
    }
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Enroll students"
      description="Search existing learners or invite by email."
      onSubmit={handleSubmit}
      submitLabel={`Enroll${selected.length > 0 ? ` (${selected.length})` : ""}`}
      submitting={addEnrollments.isPending}
      submitDisabled={selected.length === 0}
      size="sm"
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className={LABEL_CLS}>Students</Label>
          <AsyncMultiSelect
            value={selected}
            onChange={(next) => setSelected(next as SelectedStudent[])}
            loadOptions={loadOptions}
            allowAdHoc={allowAdHoc}
            placeholder="Add a student…"
            searchPlaceholder="Name or email"
            emptyMessage="No learners match — type a full email to invite"
          />
          {error && (
            <p className="text-xs font-medium text-destructive">{error}</p>
          )}
        </div>

        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="size-3.5" />
              Selected
            </span>
            <span className="font-mono font-semibold">{selected.length}</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Existing learners are enrolled instantly. Email invites become real
            enrollments once the recipient signs up.
          </p>
        </div>
      </div>
    </FormSheet>
  );
}
