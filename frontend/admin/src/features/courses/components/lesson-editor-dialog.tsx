"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  useLesson,
  useUpdateLesson,
  useUpdateQuizQuestions,
} from "@/lib/hooks/use-lessons";
import { queryKeys } from "@/lib/query-keys";
import { VideoUpload } from "./video-upload";
import { getApiError } from "@/lib/api/errors";
import { QuizBuilder, type QuizQuestion } from "./quiz-builder";
import { SecureVideoPlayer } from "@/components/ui/secure-video-player";

interface LessonEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonId: string | null;
  courseId: string;
}

export function LessonEditorDialog({
  open,
  onOpenChange,
  lessonId,
  courseId,
}: LessonEditorDialogProps) {
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState("");
  const [description, setDescription] = useState("");
  const [isFreePreview, setIsFreePreview] = useState(false);
  const [textContent, setTextContent] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [duration, setDuration] = useState(0);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const queryClient = useQueryClient();
  const { data: lesson, isLoading } = useLesson({
    enabled: true,
    id: lessonId || undefined,
  });
  const updateLessonMutation = useUpdateLesson();
  const updateQuizMutation = useUpdateQuizQuestions();

  useEffect(() => {
    if (lesson) {
      setTitle(lesson.title);
      setDescription(lesson.description || "");
      setIsFreePreview(lesson.isFreePreview || false);
      setTextContent(lesson.textContent || "");
      setVideoUrl(lesson.videoUrl || "");
      setDuration(lesson.duration || 0);
      if (lesson.questions) {
        setQuestions(
          lesson.questions.map((q) => ({
            questionId: q.quizQuestionId,
            text: q.question,
            options: q.answers.map((a) => a.text),
            correctOptionIndex: q.answers.findIndex((a) => a.isCorrect),
            explanation: q.explanation || "",
          })),
        );
      } else {
        setQuestions([]);
      }
    }
  }, [lesson]);

  const handleSave = async () => {
    if (!lessonId) return;
    if (title.trim() === "") {
      setTitleError("Title is required");
      return;
    }
    setTitleError("");
    try {
      await updateLessonMutation.mutateAsync({
        id: lessonId,
        dto: {
          title,
          description,
          isFreePreview,
          textContent: lesson?.type === "TEXT" ? textContent : undefined,
          videoUrl: lesson?.type === "VIDEO" ? videoUrl : undefined,
          duration: lesson?.type === "VIDEO" ? duration : undefined,
        },
      });
      if (lesson?.type === "QUIZ") {
        await updateQuizMutation.mutateAsync({ lessonId, questions });
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.sections.list(courseId),
      });
      toast.success("Lesson saved.");
      onOpenChange(false);
    } catch (err) {
      toast.error(getApiError(err, "Failed to update lesson.").message);
    }
  };

  if (!lessonId) return null;

  const isSaving =
    updateLessonMutation.isPending || updateQuizMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl">
        <SheetHeader className="space-y-0.5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Lesson
          </p>
          <SheetTitle>Edit lesson</SheetTitle>
          <SheetDescription className="text-xs">
            Configure content and settings.
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <SheetBody className="scrollbar-hide flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </SheetBody>
        ) : (
          <SheetBody className="scrollbar-hide space-y-3 py-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Title
              </Label>
              <Input
                value={title}
                onChange={(e) => { setTitle(e.target.value); if (titleError) setTitleError(""); }}
                placeholder="e.g. Introduction to web development"
              />
              {titleError && <p className="text-xs text-destructive">{titleError}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Description
              </Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="resize-none"
                placeholder="Briefly describe what this lesson covers."
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
              <div className="min-w-0">
                <Label
                  htmlFor="free-preview"
                  className="cursor-pointer text-sm font-medium"
                >
                  Free preview
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Watchable without enrolling.
                </p>
              </div>
              <Switch
                id="free-preview"
                checked={isFreePreview}
                onCheckedChange={setIsFreePreview}
              />
            </div>

            {lesson?.type === "VIDEO" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Video content
                  </Label>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    MP4 · MOV · WebM
                  </span>
                </div>
                <VideoUpload
                  courseId={courseId}
                  lessonId={lessonId}
                  currentUrl={videoUrl}
                  onUploadComplete={(url) => {
                    setVideoUrl(url);
                    queryClient.invalidateQueries({
                      queryKey: queryKeys.lessons.detail(lessonId),
                    });
                  }}
                  onDurationChange={(d) => setDuration(d)}
                />
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Duration (seconds)
                  </Label>
                  <Input
                    type="number"
                    value={duration}
                    onChange={(e) =>
                      setDuration(parseInt(e.target.value) || 0)
                    }
                    placeholder="0"
                  />
                </div>
                {lessonId &&
                  (lesson?.status === "READY" ||
                    lesson?.status === "PROCESSING") && (
                    <div className="space-y-1.5 border-t border-border pt-3">
                      <Label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Preview
                      </Label>
                      <SecureVideoPlayer
                        lessonId={lessonId}
                        showStatus
                        className="rounded-lg"
                      />
                    </div>
                  )}
              </div>
            )}

            {lesson?.type === "TEXT" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Text content
                  </Label>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                    Markdown
                  </span>
                </div>
                <Textarea
                  className="min-h-[240px] resize-y font-mono text-sm leading-relaxed"
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="# Write your lesson here…"
                />
              </div>
            )}

            {lesson?.type === "QUIZ" && (
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Quiz questions
                </Label>
                <QuizBuilder questions={questions} onChange={setQuestions} />
              </div>
            )}
          </SheetBody>
        )}

        <SheetFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="gap-1.5">
            {isSaving && <Loader2 className="size-3.5 animate-spin" />}
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
