"use client";

import * as React from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Search, UserPlus } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/admin/status-pill";
import { apiClient } from "@/lib/api/client";
import { useResourceList, type ResourceRow } from "@/lib/hooks/use-resource";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function ManualEnrollmentPage() {
  const queryClient = useQueryClient();
  const [learnerSearch, setLearnerSearch] = React.useState("");
  const [courseSearch, setCourseSearch] = React.useState("");
  const [learnerId, setLearnerId] = React.useState<string | null>(null);
  const [courseId, setCourseId] = React.useState<string | null>(null);

  const learners = useResourceList("users", {
    role: "LEARNER",
    search: learnerSearch || undefined,
    limit: 8,
  });
  const courses = useResourceList("courses", {
    status: "PUBLISHED",
    search: courseSearch || undefined,
    limit: 8,
  });
  const recent = useResourceList("enrollments", {
    source: "ADMIN_GRANT",
    limit: 8,
  });

  const enrol = useMutation({
    mutationFn: (body: { userId: string; courseId: string }) =>
      apiClient.post("/enrollments/manual", body).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
      toast.success("Learner enrolled");
      setLearnerId(null);
      setCourseId(null);
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Could not enrol"),
  });

  const chosenLearner = (learners.data?.data ?? []).find(
    (u) => u.userId === learnerId,
  );
  const chosenCourse = (courses.data?.data ?? []).find(
    (c) => c.courseId === courseId,
  );
  const ready = !!learnerId && !!courseId;

  return (
    <PageLayout
      subtitle="Enrolments"
      header="Manual enrolment"
      description="Give a learner access to a course without a purchase — for corporate seats, scholarships or support fixes."
    >
      <div className="grid gap-4 [&>*]:min-w-0 xl:grid-cols-[1fr_1fr_360px]">
        <Picker
          title="1 · Choose a learner"
          search={learnerSearch}
          onSearch={setLearnerSearch}
          placeholder="Search by name or email…"
          loading={learners.isLoading}
          rows={learners.data?.data ?? []}
          idKey="userId"
          selectedId={learnerId}
          onSelect={setLearnerId}
          primary={(row) =>
            `${String(row.firstName ?? "")} ${String(row.lastName ?? "")}`.trim()
          }
          secondary={(row) => String(row.email ?? "")}
          emptyTitle="No learners found"
        />

        <Picker
          title="2 · Choose a course"
          search={courseSearch}
          onSearch={setCourseSearch}
          placeholder="Search published courses…"
          loading={courses.isLoading}
          rows={courses.data?.data ?? []}
          idKey="courseId"
          selectedId={courseId}
          onSelect={setCourseId}
          primary={(row) => String(row.title ?? "")}
          secondary={(row) =>
            `${String(row.instructorName ?? "")} · ${formatMoney(Number(row.price ?? 0))}`
          }
          emptyTitle="No courses found"
        />

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">3 · Confirm</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Summary label="Learner" value={
                chosenLearner
                  ? `${String(chosenLearner.firstName)} ${String(chosenLearner.lastName)}`
                  : "Not chosen yet"
              } muted={!chosenLearner} />
              <Summary label="Course" value={
                chosenCourse ? String(chosenCourse.title) : "Not chosen yet"
              } muted={!chosenCourse} />

              <p className="text-xs text-muted-foreground">
                The learner gets immediate access. No payment record is created and
                the enrolment is marked as an admin grant.
              </p>

              <Button
                className="w-full"
                disabled={!ready || enrol.isPending}
                onClick={() =>
                  learnerId &&
                  courseId &&
                  enrol.mutate({ userId: learnerId, courseId })
                }
              >
                <UserPlus className="mr-1.5 h-4 w-4" />
                {enrol.isPending ? "Enrolling…" : "Enrol now"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Recent admin grants</CardTitle>
            </CardHeader>
            <CardContent>
              {recent.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-md" />
                  ))}
                </div>
              ) : (recent.data?.data ?? []).length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  No manual enrolments yet.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {(recent.data?.data ?? []).map((row) => (
                    <li key={String(row.enrollmentId)} className="py-2 first:pt-0 last:pb-0">
                      <p className="truncate text-sm font-medium">
                        {String(row.userName ?? "")}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {String(row.courseTitle ?? "")}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <StatusPill value={String(row.status ?? "")} />
                        <span className="text-[11px] text-muted-foreground">
                          {formatDate(String(row.enrolledAt ?? ""))}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}

function Summary({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className={cn("text-sm", muted ? "text-muted-foreground" : "font-medium")}>
        {value}
      </p>
    </div>
  );
}

function Picker({
  title,
  search,
  onSearch,
  placeholder,
  loading,
  rows,
  idKey,
  selectedId,
  onSelect,
  primary,
  secondary,
  emptyTitle,
}: {
  title: string;
  search: string;
  onSearch: (value: string) => void;
  placeholder: string;
  loading: boolean;
  rows: ResourceRow[];
  idKey: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  primary: (row: ResourceRow) => string;
  secondary: (row: ResourceRow) => string;
  emptyTitle: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={placeholder}
            className="h-9 pl-8 text-sm"
            aria-label={placeholder}
          />
        </div>

        {loading ? (
          <div className="space-y-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title={emptyTitle}
            description="Try a different search term."
            className="py-6"
          />
        ) : (
          <ul
            role="listbox"
            aria-label={title}
            className="max-h-[320px] space-y-1 overflow-y-auto"
          >
            {rows.map((row) => {
              const id = String(row[idKey]);
              const selected = selectedId === id;
              return (
                <li key={id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => onSelect(id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-colors",
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-transparent hover:bg-accent/50",
                    )}
                  >
                    <GraduationCap
                      className={cn(
                        "h-4 w-4 shrink-0",
                        selected ? "text-primary" : "text-muted-foreground/50",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {primary(row)}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {secondary(row)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
