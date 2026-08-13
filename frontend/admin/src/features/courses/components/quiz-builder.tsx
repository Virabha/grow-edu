"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
export interface QuizQuestion {
    questionId?: string;
    text: string;
    options: string[];
    correctOptionIndex: number;
    explanation?: string;
}
interface QuizBuilderProps {
    questions: QuizQuestion[];
    onChange: (questions: QuizQuestion[]) => void;
}
export function QuizBuilder({ questions, onChange }: QuizBuilderProps) {
    const handleAddQuestion = () => {
        onChange([
            ...questions,
            {
                text: "",
                options: ["Option 1", "Option 2"],
                correctOptionIndex: 0,
                explanation: "",
            },
        ]);
    };
    const handleUpdateQuestion = (index: number, updates: Partial<QuizQuestion>) => {
        const newQuestions = [...questions];
        const existing = newQuestions[index];
        if (existing === undefined) return;
        newQuestions[index] = { ...existing, ...updates };
        onChange(newQuestions);
    };
    const handleRemoveQuestion = (index: number) => {
        onChange(questions.filter((_, i) => i !== index));
    };
    const handleAddOption = (qIndex: number) => {
        const q = questions[qIndex];
        if (!q) return;
        handleUpdateQuestion(qIndex, {
            options: [...q.options, `Option ${q.options.length + 1}`],
        });
    };
    const handleUpdateOption = (qIndex: number, oIndex: number, value: string) => {
        const q = questions[qIndex];
        if (!q) return;
        const newOptions = [...q.options];
        newOptions[oIndex] = value;
        handleUpdateQuestion(qIndex, { options: newOptions });
    };
    const handleRemoveOption = (qIndex: number, oIndex: number) => {
        const q = questions[qIndex];
        if (!q) return;
        if (q.options.length <= 2)
            return;
        const newOptions = q.options.filter((_, i) => i !== oIndex);
        let newCorrectIndex = q.correctOptionIndex;
        if (oIndex < newCorrectIndex)
            newCorrectIndex--;
        if (newCorrectIndex >= newOptions.length)
            newCorrectIndex = newOptions.length - 1;
        handleUpdateQuestion(qIndex, {
            options: newOptions,
            correctOptionIndex: newCorrectIndex
        });
    };
    return (<div className="space-y-2.5">
      {questions.map((q, qIndex) => (<Card key={qIndex} className="relative group">
           <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" onClick={() => handleRemoveQuestion(qIndex)} className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4"/>
              </Button>
           </div>
          <CardContent className="p-4 space-y-2.5">
            <div className="flex gap-2 items-start">
               <span className="bg-muted text-muted-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold mt-2 shrink-0">
                 {qIndex + 1}
               </span>
               <div className="flex-1 space-y-2.5">
                  <div className="space-y-1.5">
                    <Label>Question</Label>
                    <Textarea value={q.text} onChange={(e) => handleUpdateQuestion(qIndex, { text: e.target.value })} placeholder="Enter your question here..." rows={2}/>
                  </div>

                  <div className="space-y-3">
                    <Label>Options</Label>
                    <RadioGroup value={q.correctOptionIndex.toString()} onValueChange={(val) => handleUpdateQuestion(qIndex, { correctOptionIndex: parseInt(val) })}>
                        {q.options.map((opt, oIndex) => (<div key={oIndex} className="flex items-center gap-2">
                                <RadioGroupItem value={oIndex.toString()} id={`q${qIndex}-o${oIndex}`}/>
                                <Input value={opt} onChange={(e) => handleUpdateOption(qIndex, oIndex, e.target.value)} className="flex-1"/>
                                {q.options.length > 2 && (<Button variant="ghost" size="icon" onClick={() => handleRemoveOption(qIndex, oIndex)}>
                                        <XIcon className="h-4 w-4"/>
                                    </Button>)}
                            </div>))}
                    </RadioGroup>
                    <Button type="button" variant="outline" size="sm" onClick={() => handleAddOption(qIndex)} className="ml-6">
                        <Plus className="h-3 w-3 mr-2"/> Add Option
                    </Button>
                  </div>
                  
                   <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs">Explanation (Optional)</Label>
                    <Textarea value={q.explanation || ""} onChange={(e) => handleUpdateQuestion(qIndex, { explanation: e.target.value })} placeholder="Explain why the answer is correct..." rows={1} className="text-sm"/>
                  </div>
               </div>
            </div>
          </CardContent>
        </Card>))}

      <Button type="button" onClick={handleAddQuestion} className="w-full" variant="outline">
        <Plus className="h-4 w-4 mr-2"/> Add Question
      </Button>
    
      {questions.length === 0 && (<div className="text-center p-5 border border-dashed rounded-lg text-muted-foreground">
              No questions added yet. Click above to start building your quiz.
          </div>)}
    </div>);
}
function XIcon({ className }: {
    className?: string;
}) {
    return (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 18 18"/></svg>);
}
