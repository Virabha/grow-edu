"use client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useLesson, useUpdateLesson, useUpdateQuizQuestions } from "@/lib/hooks/use-lessons";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { VideoUpload } from "./video-upload";
import { Loader2 } from "lucide-react";
import { QuizBuilder, type QuizQuestion } from "./quiz-builder";
import { SecureVideoPlayer } from "@/components/ui/secure-video-player";
interface LessonEditorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    lessonId: string | null;
    courseId: string;
}
export function LessonEditorDialog({ open, onOpenChange, lessonId, courseId }: LessonEditorDialogProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [isFreePreview, setIsFreePreview] = useState(false);
    const [textContent, setTextContent] = useState("");
    const [videoUrl, setVideoUrl] = useState("");
    const [duration, setDuration] = useState(0);
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const queryClient = useQueryClient();
    const { data: lesson, isLoading } = useLesson({ enabled: true, id: lessonId || undefined });
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
                setQuestions(lesson.questions.map((q) => ({
                    questionId: q.quizQuestionId,
                    text: q.question,
                    options: q.answers.map((a) => a.text),
                    correctOptionIndex: q.answers.findIndex((a) => a.isCorrect),
                    explanation: q.explanation || ""
                })));
            }
            else {
                setQuestions([]);
            }
        }
    }, [lesson]);
    const handleSave = async () => {
        if (!lessonId)
            return;
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
                await updateQuizMutation.mutateAsync({
                    lessonId,
                    questions
                });
            }
            queryClient.invalidateQueries({ queryKey: queryKeys.sections.list(courseId) });
            toast.success("Lesson saved successfully");
            onOpenChange(false);
        }
        catch (e) {
            toast.error("Failed to update lesson");
        }
    };
    if (!lessonId)
        return null;
    return (<Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 py-2 border-b bg-muted/40 backdrop-blur-md">
          <DialogTitle className="text-xl font-bold tracking-tight">Edit Lesson</DialogTitle>
          <DialogDescription>
             Configure content and settings for this lesson.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (<div className="flex-1 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
            </div>) : (<div className="flex-1 overflow-y-auto p-5 space-y-2.5">
                
                <div className="space-y-2.5">
                    <Label className="text-base font-medium">Lesson Title</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-14 text-lg font-medium transition-all" placeholder="e.g. Introduction to Web Development"/>
                </div>
                
                
                <div className="space-y-2.5">
                    <Label className="text-base font-medium">Description</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="resize-none p-4 transition-all" placeholder="Briefly describe what this lesson covers..."/>
                </div>

                
                <div className="flex items-center justify-between p-4 rounded-xl border bg-card shadow-sm">
                    <div className="space-y-1">
                        <Label htmlFor="free-preview" className="text-base font-medium cursor-pointer">Free Preview</Label>
                        <p className="text-sm text-muted-foreground">Allow students to view this without purchasing.</p>
                    </div>
                    <Switch id="free-preview" checked={isFreePreview} onCheckedChange={setIsFreePreview}/>
                </div>

                {lesson?.type === "VIDEO" && (<div className="space-y-2.5 pt-2">
                         <div className="flex items-center justify-between">
                            <Label className="text-lg font-semibold">Video Content</Label>
                            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">MP4 • MOV • WebM</span>
                         </div>
                        <VideoUpload courseId={courseId} lessonId={lessonId} currentUrl={videoUrl} onUploadComplete={(url) => { setVideoUrl(url); queryClient.invalidateQueries({ queryKey: queryKeys.lessons.detail(lessonId) }); }} onDurationChange={(d) => setDuration(d)}/>
                         <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-3">
                                 <Label className="text-muted-foreground">Duration (seconds)</Label>
                                 <Input type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 0)} className="h-11" placeholder="0"/>
                            </div>
                        </div>
                        {lessonId && (lesson?.status === 'READY' || lesson?.status === 'PROCESSING') && (<div className="space-y-2 pt-2 border-t">
                                <Label className="text-base font-medium">Video Preview</Label>
                                <SecureVideoPlayer lessonId={lessonId} showStatus={true} className="rounded-lg"/>
                            </div>)}
                    </div>)}

                {lesson?.type === "TEXT" && (<div className="space-y-2.5 pt-2">
                        <div className="flex items-center justify-between mb-2">
                            <Label className="text-lg font-semibold">Text Content</Label>
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">Markdown Supported</span>
                        </div>
                        <Textarea className="font-mono text-sm min-h-[250px] leading-relaxed p-4" value={textContent} onChange={(e) => setTextContent(e.target.value)} placeholder="# Write your lesson here..."/>
                    </div>)}

                {lesson?.type === "QUIZ" && (<div className="space-y-2.5 pt-2">
                        <Label className="text-lg font-semibold">Quiz Questions</Label>
                        <QuizBuilder questions={questions} onChange={setQuestions}/>
                     </div>)}

            </div>)}

        <div className="p-4 border-t bg-muted/40 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={updateLessonMutation.isPending || updateQuizMutation.isPending}>
                {updateLessonMutation.isPending || updateQuizMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
        </div>
      </DialogContent>
    </Dialog>);
}
