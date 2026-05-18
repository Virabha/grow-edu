"use client";
import { useCourseWizard } from "../store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { useUpdateCourse, useCourse } from "@/features/courses/hooks/use-courses";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
function DynamicList({ label, placeholder, items, onChange }: {
    label: string;
    placeholder: string;
    items: string[];
    onChange: (items: string[]) => void;
}) {
    const handleAdd = () => {
        onChange([...items, ""]);
    };
    const handleRemove = (index: number) => {
        onChange(items.filter((_, i) => i !== index));
    };
    const handleChange = (index: number, value: string) => {
        const newItems = [...items];
        newItems[index] = value;
        onChange(newItems);
    };
    const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
        if (e.key === 'Enter' && items[index].trim() !== '') {
            e.preventDefault();
            if (index === items.length - 1) {
                handleAdd();
            }
        }
    };
    return (<div className="space-y-1.5">
            <Label>{label}</Label>
            <div className="space-y-1.5">
                {items.map((item, index) => (<div key={index} className="flex gap-2 group">
                        <div className="flex-1 relative">
                            <Input value={item} onChange={(e) => handleChange(index, e.target.value)} onKeyDown={(e) => handleKeyDown(e, index)} placeholder={placeholder} autoFocus={index === items.length - 1 && index > 0}/>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleRemove(index)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="h-4 w-4"/>
                        </Button>
                    </div>))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleAdd} className="mt-1 text-primary hover:text-primary border-dashed border-primary/20 hover:border-primary/50">
                <Plus className="h-4 w-4 mr-1"/> Add Another
            </Button>
        </div>);
}
export function StepAudience() {
    const { nextStep, prevStep, courseId } = useCourseWizard();
    const updateCourse = useUpdateCourse();
    const { data: course, isLoading } = useCourse({ enabled: true, courseId: courseId! });
    const [outcomes, setOutcomes] = useState<string[]>([""]);
    const [audience, setAudience] = useState<string[]>([""]);
    const [prereqs, setPrereqs] = useState<string[]>([""]);
    useEffect(() => {
        if (course) {
            if (course.learningOutcomes && course.learningOutcomes.length > 0) {
                setOutcomes(course.learningOutcomes);
            }
            if (course.targetAudience && course.targetAudience.length > 0) {
                setAudience(course.targetAudience);
            }
            if (course.requirements && course.requirements.length > 0) {
                setPrereqs(course.requirements);
            }
        }
    }, [course]);
    const onNext = async () => {
        try {
            const filteredOutcomes = outcomes.filter(o => o.trim() !== "");
            const filteredAudience = audience.filter(a => a.trim() !== "");
            const filteredPrereqs = prereqs.filter(p => p.trim() !== "");
            await updateCourse.mutateAsync({
                id: courseId!,
                dto: {
                    learningOutcomes: filteredOutcomes.length > 0 ? filteredOutcomes : undefined,
                    targetAudience: filteredAudience.length > 0 ? filteredAudience : undefined,
                    requirements: filteredPrereqs.length > 0 ? filteredPrereqs : undefined,
                },
            });
            toast.success("Audience information saved!");
            nextStep();
        }
        catch (error) {
            toast.error("Failed to save audience information");
        }
    };
    if (isLoading) {
        return (<div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
      </div>);
    }
    return (<div className="space-y-2.5">
       <div className="text-center space-y-1 mb-3">
         <h2 className="text-xl font-bold tracking-tight">Target Audience</h2>
         <p className="text-muted-foreground text-sm">Define who your course is for and what they will achieve.</p>
       </div>

      <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
        <CardContent className="pt-5 space-y-2.5">
            <DynamicList label="What will learners be able to do after completing this course?" placeholder="e.g. Build a full-stack application from scratch" items={outcomes} onChange={setOutcomes}/>

            <DynamicList label="Who is this course for?" placeholder="e.g. Beginners interested in web development" items={audience} onChange={setAudience}/>

            <DynamicList label="Are there any prerequisites?" placeholder="e.g. Basic understanding of HTML & CSS" items={prereqs} onChange={setPrereqs}/>

            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={prevStep} className="text-muted-foreground hover:text-foreground">
                Back
              </Button>
              <Button onClick={onNext} disabled={updateCourse.isPending}>
                {updateCourse.isPending ? (<>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin"/>
                    Saving...
                  </>) : ("Continue")}
              </Button>
            </div>
        </CardContent>
      </Card>
    </div>);
}
