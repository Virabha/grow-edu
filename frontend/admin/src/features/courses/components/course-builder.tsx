"use client";
import { Card, CardContent, CardHeader, CardTitle, } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSections, useCreateSection, useUpdateSection, useDeleteSection, useCreateLesson, useDeleteLesson, } from "@/lib/hooks/use-lessons";
import { Plus, GripVertical, Trash2, Pencil, ChevronRight, Video, FileText, HelpCircle, Play, } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger, } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { LessonEditorDialog } from "./lesson-editor-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Section } from "@/lib/api/services/sections";
import { Lesson } from "@/lib/api/services/lessons";
import { SecureVideoPlayer } from "@/components/ui/secure-video-player";
interface CourseBuilderProps {
    courseId: string;
}
export function CourseBuilder({ courseId }: CourseBuilderProps) {
    const { data: modules } = useSections({
        enabled: true,
        courseId,
    });
    const createModuleMutation = useCreateSection();
    const updateModuleMutation = useUpdateSection();
    const deleteModuleMutation = useDeleteSection();
    const createLessonMutation = useCreateLesson();
    const deleteLessonMutation = useDeleteLesson();
    const [isAddingModule, setIsAddingModule] = useState(false);
    const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
    const [moduleTitle, setModuleTitle] = useState("");
    const [modulePrice, setModulePrice] = useState<string>("");
    const [modulePriceType, setModulePriceType] = useState<"INCLUDED" | "INDIVIDUAL" | "BOTH">("INCLUDED");
    const [moduleTitleError, setModuleTitleError] = useState<string | null>(null);
    const [modulePriceError, setModulePriceError] = useState<string | null>(null);
    const [isAddingLessonFor, setIsAddingLessonFor] = useState<string | null>(null);
    const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
    const [previewLessonId, setPreviewLessonId] = useState<string | null>(null);
    const [lessonTitle, setLessonTitle] = useState("");
    const [lessonType, setLessonType] = useState<"VIDEO" | "TEXT" | "QUIZ">("VIDEO");
    const [lessonTitleError, setLessonTitleError] = useState<string | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState<{
        title: string;
        description: string;
        onConfirm: () => void;
        deleteType: "MODULE" | "LESSON";
    }>({
        title: "",
        description: "",
        onConfirm: () => { },
        deleteType: "MODULE",
    });
    const resetModuleForm = () => {
        setModuleTitle("");
        setModulePrice("");
        setModulePriceType("INCLUDED");
        setModuleTitleError(null);
        setModulePriceError(null);
        setIsAddingModule(false);
        setEditingModuleId(null);
    };

    const validateModuleForm = (): boolean => {
        let valid = true;
        if (!moduleTitle.trim()) {
            setModuleTitleError("Title is required.");
            valid = false;
        } else if (moduleTitle.trim().length < 2) {
            setModuleTitleError("Title must be at least 2 characters.");
            valid = false;
        } else {
            setModuleTitleError(null);
        }

        if (modulePriceType !== "INCLUDED") {
            const priceNum = parseFloat(modulePrice);
            if (!modulePrice.trim() || Number.isNaN(priceNum)) {
                setModulePriceError("Price is required when the section is sold separately.");
                valid = false;
            } else if (priceNum <= 0) {
                setModulePriceError("Price must be greater than 0.");
                valid = false;
            } else {
                setModulePriceError(null);
            }
        } else {
            setModulePriceError(null);
        }
        return valid;
    };

    const handleCreateModule = async () => {
        if (!validateModuleForm()) return;
        try {
            await createModuleMutation.mutateAsync({
                courseId,
                title: moduleTitle.trim(),
                order: modules ? modules.length + 1 : 1,
                priceType: modulePriceType,
                sectionPrice: modulePrice ? parseFloat(modulePrice) : undefined,
            });
            toast.success("Module created");
            resetModuleForm();
        }
        catch (error) {
            toast.error("Failed to create module");
        }
    };
    const handleUpdateModule = async () => {
        if (!editingModuleId) return;
        if (!validateModuleForm()) return;
        try {
            await updateModuleMutation.mutateAsync({
                id: editingModuleId,
                dto: {
                    courseId,
                    title: moduleTitle.trim(),
                    priceType: modulePriceType,
                    sectionPrice: modulePrice ? parseFloat(modulePrice) : undefined,
                },
            });
            toast.success("Module updated");
            resetModuleForm();
        }
        catch (error) {
            toast.error("Failed to update module");
        }
    };
    const confirmDeleteModule = (id: string) => {
        setConfirmConfig({
            title: "Delete Module?",
            description: "Are you sure? This will delete all lessons in this module.",
            deleteType: "MODULE",
            onConfirm: async () => {
                await deleteModuleMutation.mutateAsync({ id, courseId });
                toast.success("Module deleted");
            },
        });
        setConfirmOpen(true);
    };
    const startEditingModule = (module: Section) => {
        setEditingModuleId(module.sectionId);
        setModuleTitle(module.title);
        setModulePriceType(module.priceType);
        setModulePrice(module.sectionPrice ? String(module.sectionPrice) : "");
        setIsAddingModule(true);
    };
    const handleAddLesson = async () => {
        if (!isAddingLessonFor) return;
        if (!lessonTitle.trim()) {
            setLessonTitleError("Lesson title is required.");
            return;
        }
        if (lessonTitle.trim().length < 2) {
            setLessonTitleError("Lesson title must be at least 2 characters.");
            return;
        }
        setLessonTitleError(null);
        try {
            const newLesson = await createLessonMutation.mutateAsync({
                sectionId: isAddingLessonFor,
                title: lessonTitle.trim(),
                type: lessonType,
                order: (modules?.find((m) => m.sectionId === isAddingLessonFor)?.lessons
                    ?.length || 0) + 1,
            });
            toast.success("Lesson created");
            setLessonTitle("");
            setIsAddingLessonFor(null);
            setEditingLessonId(newLesson.lessonId);
        }
        catch (error) {
            toast.error("Failed to create lesson");
        }
    };
    const confirmDeleteLesson = (lessonId: string) => {
        setConfirmConfig({
            title: "Delete Lesson?",
            description: "This action cannot be undone.",
            deleteType: "LESSON",
            onConfirm: async () => {
                try {
                    await deleteLessonMutation.mutateAsync(lessonId);
                    toast.success("Lesson deleted");
                }
                catch (error) {
                }
            },
        });
        setConfirmOpen(true);
    };
    const getLessonIcon = (type: string) => {
        switch (type) {
            case "VIDEO":
                return <Video className="h-4 w-4"/>;
            case "TEXT":
                return <FileText className="h-4 w-4"/>;
            case "QUIZ":
                return <HelpCircle className="h-4 w-4"/>;
            default:
                return <FileText className="h-4 w-4"/>;
        }
    };
    return (<div className="space-y-2.5">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Course Curriculum</h3>
          <p className="text-sm text-muted-foreground">
            Manage sections and lessons.
          </p>
        </div>
        {!isAddingModule && (<Button onClick={() => {
                resetModuleForm();
                setIsAddingModule(true);
            }}>
            <Plus className="h-4 w-4 mr-2"/>
            Add Section
          </Button>)}
      </div>

      {isAddingModule && (<Card className="border-dashed">
          <CardHeader>
            <CardTitle>
              {editingModuleId ? "Edit Section" : "New Section"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <div className="space-y-1.5">
              <Label>
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                value={moduleTitle}
                onChange={(e) => {
                  setModuleTitle(e.target.value);
                  if (moduleTitleError) setModuleTitleError(null);
                }}
                placeholder="Section Title (e.g. Introduction)"
                autoFocus
                aria-invalid={!!moduleTitleError}
                className={moduleTitleError ? "border-destructive focus-visible:ring-destructive/30" : undefined}
              />
              {moduleTitleError && (
                <p className="text-xs text-destructive">{moduleTitleError}</p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>
                  Pricing Model <span className="text-destructive">*</span>
                </Label>
                <Select value={modulePriceType} onValueChange={(val: "INCLUDED" | "INDIVIDUAL" | "BOTH") => {
                  setModulePriceType(val);
                  if (modulePriceError) setModulePriceError(null);
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INCLUDED">Included in Course</SelectItem>
                    <SelectItem value="INDIVIDUAL">Sold Separately</SelectItem>
                    <SelectItem value="BOTH">
                      Both (Included + Separate)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>
                  Price (if separate)
                  {modulePriceType !== "INCLUDED" && (
                    <span className="text-destructive"> *</span>
                  )}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={modulePrice}
                  onChange={(e) => {
                    setModulePrice(e.target.value);
                    if (modulePriceError) setModulePriceError(null);
                  }}
                  placeholder="0.00"
                  disabled={modulePriceType === "INCLUDED"}
                  aria-invalid={!!modulePriceError}
                  className={modulePriceError ? "border-destructive focus-visible:ring-destructive/30" : undefined}
                />
                {modulePriceError && (
                  <p className="text-xs text-destructive">{modulePriceError}</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={resetModuleForm} disabled={createModuleMutation.isPending ||
                updateModuleMutation.isPending}>
                Cancel
              </Button>
              <Button onClick={editingModuleId ? handleUpdateModule : handleCreateModule} disabled={createModuleMutation.isPending ||
                updateModuleMutation.isPending}>
                {editingModuleId
                ? updateModuleMutation.isPending
                    ? "Updating..."
                    : "Update Section"
                : createModuleMutation.isPending
                    ? "Creating..."
                    : "Create Section"}
              </Button>
            </div>
          </CardContent>
        </Card>)}

      <div className="space-y-2.5">
        {modules?.map((module: Section) => (<Collapsible key={module.sectionId} defaultOpen className="border rounded-lg bg-card">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3 flex-1">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-0 h-auto hover:bg-transparent">
                    <ChevronRight className="h-4 w-4 transition-transform ui-open:rotate-90"/>
                  </Button>
                </CollapsibleTrigger>
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab"/>
                <div>
                  <h4 className="font-medium text-sm">{module.title}</h4>
                  {module.sectionPrice && (<Badge variant="secondary" className="mt-1 text-xs">
                      ₹{Number(module.sectionPrice).toFixed(2)} ({module.priceType})
                    </Badge>)}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => startEditingModule(module)}>
                  <Pencil className="h-4 w-4 text-muted-foreground"/>
                </Button>
                <Button variant="ghost" size="icon" onClick={() => confirmDeleteModule(module.sectionId)} disabled={deleteModuleMutation.isPending}>
                  <Trash2 className="h-4 w-4 text-destructive"/>
                </Button>
              </div>
            </div>

            <CollapsibleContent>
              <div className="px-4 pb-4 space-y-2">
                {module.lessons && module.lessons.length > 0 ? (module.lessons.map((lesson: Lesson) => (<div key={lesson.lessonId} className="flex items-center justify-between p-2 rounded-md bg-muted/50 ml-6 pl-2">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab"/>
                        {getLessonIcon(lesson.type)}
                        <span className="text-sm">{lesson.title}</span>
                        {lesson.isFreePreview && (<Badge variant="outline" className="text-[10px] h-5">
                            Free Preview
                          </Badge>)}
                      </div>
                      <div className="flex items-center gap-1">
                        {lesson.type === "VIDEO" && (<Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPreviewLessonId(lesson.lessonId)} title="Preview video">
                            <Play className="h-3 w-3"/>
                          </Button>)}
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingLessonId(lesson.lessonId)} title="Edit lesson">
                          <Pencil className="h-3 w-3"/>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => confirmDeleteLesson(lesson.lessonId)} disabled={deleteLessonMutation.isPending} title="Delete lesson">
                          <Trash2 className="h-3 w-3 text-destructive"/>
                        </Button>
                      </div>
                    </div>))) : (<div className="text-sm text-muted-foreground ml-8 italic">
                    No lessons yet
                  </div>)}

                <div className="ml-8 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAddingLessonFor(module.sectionId)}
                  >
                    <Plus className="h-3 w-3 mr-2"/> Add Lesson
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>))}
        {(!modules || modules.length === 0) && !isAddingModule && (<div className="flex flex-col items-center justify-center p-5 border border-dashed rounded-lg bg-muted/20 text-muted-foreground">
            <p>No sections yet. Start by adding one!</p>
          </div>)}
      </div>

      <LessonEditorDialog open={!!editingLessonId} onOpenChange={(open) => !open && setEditingLessonId(null)} lessonId={editingLessonId} courseId={courseId}/>

      <Sheet
        open={!!isAddingLessonFor}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddingLessonFor(null);
            setLessonTitle("");
            setLessonType("VIDEO");
            setLessonTitleError(null);
          }
        }}
      >
        <SheetContent className="sm:max-w-md">
          <SheetHeader className="space-y-0.5 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Lesson
            </p>
            <SheetTitle>Add new lesson</SheetTitle>
            <SheetDescription className="text-xs">
              Create a new lesson in this section.
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="scrollbar-hide space-y-3 py-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Lesson title <span className="text-destructive">*</span>
              </Label>
              <Input
                value={lessonTitle}
                onChange={(e) => {
                  setLessonTitle(e.target.value);
                  if (lessonTitleError) setLessonTitleError(null);
                }}
                placeholder="Lesson title"
                autoFocus
                aria-invalid={!!lessonTitleError}
                className={lessonTitleError ? "border-destructive focus-visible:ring-destructive/30" : undefined}
              />
              {lessonTitleError && (
                <p className="text-xs text-destructive">{lessonTitleError}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Type
              </Label>
              <Select
                value={lessonType}
                onValueChange={(val) =>
                  setLessonType(val as "VIDEO" | "TEXT" | "QUIZ")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIDEO">Video</SelectItem>
                  <SelectItem value="TEXT">Text / article</SelectItem>
                  <SelectItem value="QUIZ">Quiz</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </SheetBody>
          <SheetFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setIsAddingLessonFor(null);
                setLessonTitle("");
              }}
              disabled={createLessonMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddLesson}
              disabled={
                createLessonMutation.isPending || !lessonTitle.trim()
              }
            >
              {createLessonMutation.isPending ? "Adding…" : "Add lesson"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={!!previewLessonId} onOpenChange={(open) => !open && setPreviewLessonId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Video Preview</DialogTitle>
            <DialogDescription>Preview your video lesson</DialogDescription>
          </DialogHeader>
          <div className="w-full">
            {previewLessonId && (<SecureVideoPlayer lessonId={previewLessonId} showStatus={true} className="rounded-lg"/>)}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} title={confirmConfig.title} description={confirmConfig.description} onConfirm={confirmConfig.onConfirm} confirmText="Delete" variant="destructive"/>
    </div>);
}
