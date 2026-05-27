"use client";

import Link from "next/link";
import { use, useCallback, useState } from "react";
import { toast } from "sonner";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { SecureImage } from "@/components/ui/secure-image";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  ClipboardList,
  FileQuestion,
  FileText,
  Layers,
  Megaphone,
  MessageCircleQuestion,
  MoreHorizontal,
  Pencil,
  Pin,
  PlayCircle,
  Plus,
  Radio,
  Trash2,
  UserPlus,
  Users,
  Video,
  ExternalLink,
} from "lucide-react";
import {
  useBatch,
  useBatchAnalytics,
  useBatchAnnouncements,
  useBatchDoubts,
  useBatchEnrollments,
  useBatchQuizzes,
  useBatchResources,
  useBatchSessions,
  useBatchSubjects,
  useDeleteBatchAnnouncement,
  useDeleteBatchDoubt,
  useDeleteBatchQuiz,
  useDeleteBatchResource,
  useDeleteBatchSession,
  useDeleteBatchSubject,
  useRemoveBatchEnrollment,
} from "@/features/batches/hooks/use-batches";
import { BatchFormDialog } from "@/features/batches/components/batch-form-dialog";
import { SubjectFormDialog } from "@/features/batches/components/subject-form-dialog";
import { SessionFormDialog } from "@/features/batches/components/session-form-dialog";
import { EnrollStudentsDialog } from "@/features/batches/components/enroll-students-dialog";
import { ResourceFormDialog } from "@/features/batches/components/resource-form-dialog";
import { QuizFormDialog } from "@/features/batches/components/quiz-form-dialog";
import { AnnouncementFormDialog } from "@/features/batches/components/announcement-form-dialog";
import type {
  BatchAnnouncement,
  BatchDoubt,
  BatchEnrollment,
  BatchQuiz,
  BatchResource,
  BatchResourceType,
  BatchSession,
  BatchSubject,
} from "@/features/batches/types";

const SESSION_STATUS_TONE: Record<string, string> = {
  SCHEDULED: "bg-amber-500",
  LIVE: "bg-emerald-600",
  ENDED: "bg-zinc-500",
  CANCELLED: "bg-red-500",
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminBatchDetailPage(props: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = use(props.params);
  const { data: batch, isLoading } = useBatch(batchId);
  const { data: subjects = [] } = useBatchSubjects(batchId);
  const { data: sessions = [] } = useBatchSessions(batchId);
  const [enrollmentSearch, setEnrollmentSearch] = useState("");
  const { data: enrollmentsData } = useBatchEnrollments(batchId, {
    search: enrollmentSearch || undefined,
    limit: 50,
  });
  const { data: announcements = [] } = useBatchAnnouncements(batchId);
  const { data: resources = [] } = useBatchResources(batchId);
  const { data: doubts = [] } = useBatchDoubts(batchId);
  const { data: quizzes = [] } = useBatchQuizzes(batchId);
  const { data: analytics } = useBatchAnalytics(batchId);

  const deleteSubject = useDeleteBatchSubject(batchId);
  const deleteSession = useDeleteBatchSession(batchId);
  const removeEnrollment = useRemoveBatchEnrollment(batchId);
  const deleteAnnouncement = useDeleteBatchAnnouncement(batchId);
  const deleteResource = useDeleteBatchResource(batchId);
  const deleteDoubt = useDeleteBatchDoubt(batchId);
  const deleteQuiz = useDeleteBatchQuiz(batchId);

  const [batchEditOpen, setBatchEditOpen] = useState(false);
  const [subjectFormOpen, setSubjectFormOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<BatchSubject | null>(null);
  const [sessionFormOpen, setSessionFormOpen] = useState(false);
  const [sessionDefaultType, setSessionDefaultType] = useState<
    "LIVE" | "RECORDING"
  >("LIVE");
  const [editingSession, setEditingSession] = useState<BatchSession | null>(null);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [announceFormOpen, setAnnounceFormOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<BatchAnnouncement | null>(null);

  const [confirmSubjectDelete, setConfirmSubjectDelete] =
    useState<BatchSubject | null>(null);
  const [confirmSessionDelete, setConfirmSessionDelete] =
    useState<BatchSession | null>(null);
  const [confirmEnrollmentRemove, setConfirmEnrollmentRemove] =
    useState<BatchEnrollment | null>(null);
  const [confirmAnnouncementDelete, setConfirmAnnouncementDelete] =
    useState<BatchAnnouncement | null>(null);
  const [resourceFormOpen, setResourceFormOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<BatchResource | null>(null);
  const [resourceDefaultType, setResourceDefaultType] =
    useState<BatchResourceType>("NOTES");
  const [confirmResourceDelete, setConfirmResourceDelete] =
    useState<BatchResource | null>(null);
  const [quizFormOpen, setQuizFormOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<BatchQuiz | null>(null);
  const [confirmQuizDelete, setConfirmQuizDelete] = useState<BatchQuiz | null>(null);
  const [confirmDoubtDelete, setConfirmDoubtDelete] = useState<BatchDoubt | null>(null);

  const openSubject = useCallback((s: BatchSubject | null) => {
    setEditingSubject(s);
    setSubjectFormOpen(true);
  }, []);

  const openSession = useCallback(
    (s: BatchSession | null, t: "LIVE" | "RECORDING" = "LIVE") => {
      setEditingSession(s);
      setSessionDefaultType(t);
      setSessionFormOpen(true);
    },
    []
  );

  if (isLoading) {
    return (
      <PageLayout header="Loading batch…">
        <div className="space-y-3">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </PageLayout>
    );
  }

  if (!batch) {
    return (
      <PageLayout header="Not found">
        <EmptyState
          title="Batch not found"
          description="It may have been deleted."
        />
      </PageLayout>
    );
  }

  const enrollments = enrollmentsData?.data ?? [];

  return (
    <PageLayout
      subtitle="Cohort"
      header={batch.title}
      description={batch.shortDescription ?? batch.targetExam ?? "Manage this batch."}
      actions={
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/batches">
              <ArrowLeft className="size-3.5 mr-1.5" />
              All batches
            </Link>
          </Button>
          <Button size="sm" onClick={() => setBatchEditOpen(true)}>
            <Pencil className="size-3.5 mr-1.5" />
            Edit
          </Button>
        </div>
      }
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Status
          </p>
          <p className="mt-1 font-display text-lg font-semibold">{batch.status}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Window
          </p>
          <p className="mt-1 text-sm">
            {formatDate(batch.startDate)} – {formatDate(batch.endDate)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Enrolled
          </p>
          <p className="mt-1 font-display text-lg font-semibold">
            {enrollmentsData?.pagination.total ?? 0}
            {batch.capacity ? ` / ${batch.capacity}` : ""}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Sessions
          </p>
          <p className="mt-1 font-display text-lg font-semibold">{sessions.length}</p>
        </div>
      </div>

      <Tabs defaultValue="content">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="content">
            <Layers className="size-3.5 mr-1.5" />
            Content
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="size-3.5 mr-1.5" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="resources">
            <FileText className="size-3.5 mr-1.5" />
            Resources
          </TabsTrigger>
          <TabsTrigger value="quizzes">
            <ClipboardList className="size-3.5 mr-1.5" />
            Quizzes
          </TabsTrigger>
          <TabsTrigger value="doubts">
            <MessageCircleQuestion className="size-3.5 mr-1.5" />
            Doubts
          </TabsTrigger>
          <TabsTrigger value="enrollments">
            <Users className="size-3.5 mr-1.5" />
            Enrollments
          </TabsTrigger>
          <TabsTrigger value="announcements">
            <Megaphone className="size-3.5 mr-1.5" />
            Announcements
          </TabsTrigger>
        </TabsList>

        {/* ─── Content tab (subjects + sessions) ───────────────────────── */}
        <TabsContent value="content" className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-medium">Subjects</h3>
                <p className="text-xs text-muted-foreground">
                  Group sessions by subject. Optional but recommended.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => openSubject(null)}>
                <Plus className="size-3.5 mr-1.5" />
                Add subject
              </Button>
            </div>
            {subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subjects yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {subjects.map((s) => (
                  <div
                    key={s.subjectId}
                    className="group flex items-center gap-2 rounded-full border border-border bg-background pl-3 pr-1 py-1"
                  >
                    {s.color && (
                      <span
                        className="size-2.5 rounded-full"
                        style={{ background: s.color }}
                      />
                    )}
                    <span className="text-sm font-medium">{s.name}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="size-7 p-0">
                          <MoreHorizontal className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openSubject(s)}>
                          <Pencil className="size-3.5 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setConfirmSubjectDelete(s)}
                        >
                          <Trash2 className="size-3.5 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-medium">Sessions</h3>
                <p className="text-xs text-muted-foreground">
                  Live classes and recordings available to enrolled students.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openSession(null, "LIVE")}
                >
                  <Radio className="size-3.5 mr-1.5" />
                  Schedule live
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openSession(null, "RECORDING")}
                >
                  <Video className="size-3.5 mr-1.5" />
                  Add recording
                </Button>
              </div>
            </div>
            {sessions.length === 0 ? (
              <EmptyState
                title="No sessions yet"
                description="Schedule a live class or upload a recording."
                icon={<PlayCircle className="h-10 w-10" />}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-display text-xs">Title</TableHead>
                      <TableHead className="font-display text-xs">Type</TableHead>
                      <TableHead className="hidden font-display text-xs md:table-cell">
                        When
                      </TableHead>
                      <TableHead className="hidden font-display text-xs lg:table-cell">
                        Subject
                      </TableHead>
                      <TableHead className="font-display text-xs">Status</TableHead>
                      <TableHead className="text-right font-display text-xs">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((s) => (
                      <TableRow key={s.sessionId}>
                        <TableCell className="font-medium">{s.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{s.type}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {s.type === "LIVE"
                            ? formatDateTime(s.scheduledStartAt)
                            : formatDateTime(s.createdAt)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {subjects.find((sub) => sub.subjectId === s.subjectId)?.name ??
                            "—"}
                        </TableCell>
                        <TableCell>
                          <Badge className={SESSION_STATUS_TONE[s.status] ?? "bg-zinc-500"}>
                            {s.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {s.joinUrl && (
                                <DropdownMenuItem asChild>
                                  <a
                                    href={s.joinUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <ExternalLink className="size-3.5 mr-2" />
                                    Open join link
                                  </a>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => openSession(s, s.type)}>
                                <Pencil className="size-3.5 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setConfirmSessionDelete(s)}
                              >
                                <Trash2 className="size-3.5 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </TabsContent>

        {/* ─── Enrollments tab ─────────────────────────────────────────── */}
        <TabsContent value="enrollments" className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Input
              placeholder="Search students…"
              value={enrollmentSearch}
              onChange={(e) => setEnrollmentSearch(e.target.value)}
              className="sm:max-w-xs"
            />
            <Button size="sm" onClick={() => setEnrollOpen(true)}>
              <UserPlus className="size-3.5 mr-1.5" />
              Enroll students
            </Button>
          </div>
          {enrollments.length === 0 ? (
            <EmptyState
              title="No students enrolled"
              description="Add students by email to give them access."
              icon={<Users className="h-10 w-10" />}
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-display text-xs">Student</TableHead>
                      <TableHead className="hidden font-display text-xs md:table-cell">
                        Email
                      </TableHead>
                      <TableHead className="hidden font-display text-xs lg:table-cell">
                        Enrolled
                      </TableHead>
                      <TableHead className="hidden font-display text-xs lg:table-cell">
                        Access ends
                      </TableHead>
                      <TableHead className="text-right font-display text-xs">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrollments.map((e) => (
                      <TableRow key={e.enrollmentId}>
                        <TableCell className="flex items-center gap-3 font-medium">
                          {e.user.profileImage && (
                            <SecureImage
                              src={e.user.profileImage}
                              alt=""
                              className="size-7 rounded-full object-cover"
                            />
                          )}
                          <span>
                            {[e.user.firstName, e.user.lastName]
                              .filter(Boolean)
                              .join(" ") || e.user.email}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {e.user.email}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {formatDate(e.createdAt)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {e.accessEndsAt ? formatDate(e.accessEndsAt) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => setConfirmEnrollmentRemove(e)}
                          >
                            Revoke
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ─── Analytics tab ──────────────────────────────────────────── */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Enrolled
              </p>
              <p className="mt-1 font-display text-2xl font-semibold">
                {analytics?.enrollmentCount ?? "—"}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Avg attendance
              </p>
              <p className="mt-1 font-display text-2xl font-semibold">
                {analytics?.avgAttendancePercent ?? "—"}%
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Avg quiz score
              </p>
              <p className="mt-1 font-display text-2xl font-semibold">
                {analytics?.avgQuizScorePercent != null
                  ? `${analytics.avgQuizScorePercent}%`
                  : "—"}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Open doubts
              </p>
              <p className="mt-1 font-display text-2xl font-semibold">
                {analytics?.openDoubts ?? "—"}
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Live sessions</p>
              <p className="mt-1 font-display text-lg font-semibold">
                {analytics?.liveSessions ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Recordings</p>
              <p className="mt-1 font-display text-lg font-semibold">
                {analytics?.recordings ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Resources (PDFs)</p>
              <p className="mt-1 font-display text-lg font-semibold">
                {analytics?.resources ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Quizzes</p>
              <p className="mt-1 font-display text-lg font-semibold">
                {analytics?.quizzes ?? 0}
              </p>
            </div>
          </div>
        </TabsContent>

        {/* ─── Resources tab ──────────────────────────────────────────── */}
        <TabsContent value="resources" className="space-y-3">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditingResource(null);
                setResourceDefaultType("DPP");
                setResourceFormOpen(true);
              }}
            >
              <Plus className="size-3.5 mr-1.5" />
              DPP
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditingResource(null);
                setResourceDefaultType("NOTES");
                setResourceFormOpen(true);
              }}
            >
              <Plus className="size-3.5 mr-1.5" />
              Notes
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditingResource(null);
                setResourceDefaultType("REFERENCE");
                setResourceFormOpen(true);
              }}
            >
              <Plus className="size-3.5 mr-1.5" />
              Reference
            </Button>
          </div>
          {resources.length === 0 ? (
            <EmptyState
              title="No resources yet"
              description="Upload PDFs for DPP, Notes, and references."
              icon={<FileText className="h-10 w-10" />}
            />
          ) : (
            (["DPP", "NOTES", "REFERENCE"] as const).map((type) => {
              const list = resources.filter((r) => r.type === type);
              if (list.length === 0) return null;
              return (
                <section key={type} className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="font-display text-base font-medium mb-2">
                    {type === "DPP"
                      ? "Daily Practice Problems"
                      : type === "NOTES"
                        ? "Notes / Study material"
                        : "Reference"}
                  </h3>
                  <ul className="space-y-2">
                    {list.map((r) => (
                      <li
                        key={r.resourceId}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium line-clamp-1">
                            {r.dayNumber ? `Day ${r.dayNumber} — ` : ""}
                            {r.title}
                          </p>
                          {r.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {r.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button asChild size="sm" variant="ghost">
                            <a href={r.fileUrl} target="_blank" rel="noreferrer">
                              <ExternalLink className="size-3.5" />
                            </a>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingResource(r);
                              setResourceFormOpen(true);
                            }}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => setConfirmResourceDelete(r)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })
          )}
        </TabsContent>

        {/* ─── Quizzes tab ────────────────────────────────────────────── */}
        <TabsContent value="quizzes" className="space-y-3">
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => {
                setEditingQuiz(null);
                setQuizFormOpen(true);
              }}
            >
              <Plus className="size-3.5 mr-1.5" />
              New quiz
            </Button>
          </div>
          {quizzes.length === 0 ? (
            <EmptyState
              title="No quizzes yet"
              description="Create your first quiz or test for students."
              icon={<ClipboardList className="h-10 w-10" />}
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-display text-xs">Title</TableHead>
                    <TableHead className="hidden font-display text-xs md:table-cell">
                      Duration
                    </TableHead>
                    <TableHead className="hidden font-display text-xs lg:table-cell">
                      Attempts
                    </TableHead>
                    <TableHead className="font-display text-xs">Status</TableHead>
                    <TableHead className="text-right font-display text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quizzes.map((q) => (
                    <TableRow key={q.quizId}>
                      <TableCell>
                        <Link
                          href={`/admin/batches/${batchId}/quizzes/${q.quizId}`}
                          className="font-medium hover:underline"
                        >
                          {q.title}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {q.durationMinutes} min
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        Max {q.maxAttempts}
                      </TableCell>
                      <TableCell>
                        <Badge variant={q.publishedAt ? "default" : "outline"}>
                          {q.publishedAt ? "Published" : "Draft"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/batches/${batchId}/quizzes/${q.quizId}`}>
                                <FileQuestion className="size-3.5 mr-2" />
                                Manage questions
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingQuiz(q);
                                setQuizFormOpen(true);
                              }}
                            >
                              <Pencil className="size-3.5 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setConfirmQuizDelete(q)}
                            >
                              <Trash2 className="size-3.5 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ─── Doubts tab ─────────────────────────────────────────────── */}
        <TabsContent value="doubts" className="space-y-3">
          {doubts.length === 0 ? (
            <EmptyState
              title="No doubts posted yet"
              description="Student doubts will appear here. Answers from admins/instructors are marked official."
              icon={<MessageCircleQuestion className="h-10 w-10" />}
            />
          ) : (
            <ul className="space-y-3">
              {doubts.map((d) => (
                <li
                  key={d.doubtId}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/batches/${batchId}/doubts/${d.doubtId}`}
                          className="font-display text-base font-medium hover:underline"
                        >
                          {d.title}
                        </Link>
                        <Badge
                          variant={
                            d.status === "OPEN"
                              ? "secondary"
                              : d.status === "ANSWERED"
                                ? "default"
                                : "outline"
                          }
                        >
                          {d.status}
                        </Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {d.body}
                      </p>
                      <p className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                        {[d.author.firstName, d.author.lastName].filter(Boolean).join(" ") ||
                          "Student"}
                        {" • "}
                        {formatDateTime(d.createdAt)}
                        {" • "}
                        {d.replyCount} repl{d.replyCount === 1 ? "y" : "ies"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setConfirmDoubtDelete(d)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        {/* ─── Announcements tab ───────────────────────────────────────── */}
        <TabsContent value="announcements" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setEditingAnnouncement(null); setAnnounceFormOpen(true); }}>
              <Plus className="size-3.5 mr-1.5" />
              Post announcement
            </Button>
          </div>
          {announcements.length === 0 ? (
            <EmptyState
              title="No announcements"
              description="Notify enrolled students about classes, schedule changes, or important updates."
              icon={<Megaphone className="h-10 w-10" />}
            />
          ) : (
            <ul className="space-y-3">
              {announcements.map((a) => (
                <li
                  key={a.announcementId}
                  className="group rounded-2xl border border-border bg-card p-4"
                >
                  <div className="mb-1 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {a.pinned && <Pin className="size-3.5 text-amber-500" />}
                      <h4 className="font-display text-base font-medium">{a.title}</h4>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingAnnouncement(a);
                          setAnnounceFormOpen(true);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => setConfirmAnnouncementDelete(a)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {a.body}
                  </p>
                  <p className="mt-2 flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                    <CalendarDays className="size-3" />
                    {formatDateTime(a.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <BatchFormDialog open={batchEditOpen} onOpenChange={setBatchEditOpen} batch={batch} />
      <SubjectFormDialog
        batchId={batchId}
        open={subjectFormOpen}
        onOpenChange={setSubjectFormOpen}
        subject={editingSubject}
      />
      <SessionFormDialog
        batchId={batchId}
        subjects={subjects}
        open={sessionFormOpen}
        onOpenChange={setSessionFormOpen}
        session={editingSession}
        defaultType={sessionDefaultType}
      />
      <EnrollStudentsDialog
        batchId={batchId}
        open={enrollOpen}
        onOpenChange={setEnrollOpen}
      />
      <AnnouncementFormDialog
        batchId={batchId}
        open={announceFormOpen}
        onOpenChange={setAnnounceFormOpen}
        announcement={editingAnnouncement}
      />
      <ResourceFormDialog
        batchId={batchId}
        subjects={subjects}
        open={resourceFormOpen}
        onOpenChange={setResourceFormOpen}
        resource={editingResource}
        defaultType={resourceDefaultType}
      />
      <QuizFormDialog
        batchId={batchId}
        subjects={subjects}
        open={quizFormOpen}
        onOpenChange={setQuizFormOpen}
        quiz={editingQuiz}
      />

      {/* Confirmations */}
      <ConfirmDialog
        open={!!confirmSubjectDelete}
        onOpenChange={(o) => !o && setConfirmSubjectDelete(null)}
        title="Delete subject"
        description={`Delete "${confirmSubjectDelete?.name}"?`}
        onConfirm={() => {
          if (confirmSubjectDelete) {
            deleteSubject.mutate(confirmSubjectDelete.subjectId, {
              onSuccess: () => toast.success("Subject deleted"),
            });
          }
        }}
        confirmText="Delete"
        variant="destructive"
      />
      <ConfirmDialog
        open={!!confirmSessionDelete}
        onOpenChange={(o) => !o && setConfirmSessionDelete(null)}
        title="Delete session"
        description={`Delete "${confirmSessionDelete?.title}"?`}
        onConfirm={() => {
          if (confirmSessionDelete) {
            deleteSession.mutate(confirmSessionDelete.sessionId, {
              onSuccess: () => toast.success("Session deleted"),
            });
          }
        }}
        confirmText="Delete"
        variant="destructive"
      />
      <ConfirmDialog
        open={!!confirmEnrollmentRemove}
        onOpenChange={(o) => !o && setConfirmEnrollmentRemove(null)}
        title="Revoke access"
        description={`Revoke access for ${confirmEnrollmentRemove?.user.email}?`}
        onConfirm={() => {
          if (confirmEnrollmentRemove) {
            removeEnrollment.mutate(confirmEnrollmentRemove.userId, {
              onSuccess: () => toast.success("Access revoked"),
            });
          }
        }}
        confirmText="Revoke"
        variant="destructive"
      />
      <ConfirmDialog
        open={!!confirmAnnouncementDelete}
        onOpenChange={(o) => !o && setConfirmAnnouncementDelete(null)}
        title="Delete announcement"
        description={`Delete "${confirmAnnouncementDelete?.title}"?`}
        onConfirm={() => {
          if (confirmAnnouncementDelete) {
            deleteAnnouncement.mutate(confirmAnnouncementDelete.announcementId, {
              onSuccess: () => toast.success("Announcement deleted"),
            });
          }
        }}
        confirmText="Delete"
        variant="destructive"
      />
      <ConfirmDialog
        open={!!confirmResourceDelete}
        onOpenChange={(o) => !o && setConfirmResourceDelete(null)}
        title="Delete resource"
        description={`Delete "${confirmResourceDelete?.title}"?`}
        onConfirm={() => {
          if (confirmResourceDelete) {
            deleteResource.mutate(confirmResourceDelete.resourceId, {
              onSuccess: () => toast.success("Resource deleted"),
            });
          }
        }}
        confirmText="Delete"
        variant="destructive"
      />
      <ConfirmDialog
        open={!!confirmQuizDelete}
        onOpenChange={(o) => !o && setConfirmQuizDelete(null)}
        title="Delete quiz"
        description={`Delete "${confirmQuizDelete?.title}"? All attempts will be lost.`}
        onConfirm={() => {
          if (confirmQuizDelete) {
            deleteQuiz.mutate(confirmQuizDelete.quizId, {
              onSuccess: () => toast.success("Quiz deleted"),
            });
          }
        }}
        confirmText="Delete"
        variant="destructive"
      />
      <ConfirmDialog
        open={!!confirmDoubtDelete}
        onOpenChange={(o) => !o && setConfirmDoubtDelete(null)}
        title="Delete doubt"
        description={`Delete "${confirmDoubtDelete?.title}"?`}
        onConfirm={() => {
          if (confirmDoubtDelete) {
            deleteDoubt.mutate(confirmDoubtDelete.doubtId, {
              onSuccess: () => toast.success("Doubt deleted"),
            });
          }
        }}
        confirmText="Delete"
        variant="destructive"
      />
    </PageLayout>
  );
}
