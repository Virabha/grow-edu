"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, ArrowRight } from "lucide-react";
import { QuizQuestionEntity } from "@/lib/api/services/lessons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
interface QuizPlayerProps {
    questions: QuizQuestionEntity[];
    onComplete: (score: number, passed: boolean) => void;
    passingPercentage?: number;
}
export function QuizPlayer({ questions, onComplete, passingPercentage = 70 }: QuizPlayerProps) {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [shuffledQuestions, setShuffledQuestions] = useState<QuizQuestionEntity[]>([]);
    const shuffleQuestions = (qs: QuizQuestionEntity[]) => {
        return [...qs].sort(() => Math.random() - 0.5);
    };
    useEffect(() => {
        setShuffledQuestions(shuffleQuestions(questions));
    }, [questions]);
    const currentQuestion = shuffledQuestions[currentQuestionIndex] || questions[0];
    const isLastQuestion = currentQuestionIndex === shuffledQuestions.length - 1;
    const progress = ((Object.keys(answers).length) / shuffledQuestions.length) * 100;
    const handleSelect = (optionIndex: number) => {
        if (isSubmitted)
            return;
        setAnswers((prev) => ({
            ...prev,
            [currentQuestion.quizQuestionId]: optionIndex,
        }));
    };
    const handleNext = () => {
        if (currentQuestionIndex < shuffledQuestions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };
    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };
    const handleSubmit = () => {
        if (Object.keys(answers).length < shuffledQuestions.length) {
            toast.error("Please answer all questions before submitting.");
            return;
        }
        let correctCount = 0;
        shuffledQuestions.forEach((q) => {
            const selectedIndex = answers[q.quizQuestionId];
            const correctIndex = q.answers.findIndex(a => a.isCorrect);
            if (selectedIndex === correctIndex)
                correctCount++;
        });
        const calculatedScore = Math.round((correctCount / shuffledQuestions.length) * 100);
        setScore(calculatedScore);
        setIsSubmitted(true);
        const passed = calculatedScore >= passingPercentage;
        if (passed) {
            toast.success(`Passed! Score: ${calculatedScore}%`);
            onComplete(calculatedScore, true);
        }
        else {
            toast.error(`Failed. Score: ${calculatedScore}%`);
        }
    };
    const handleRetry = () => {
        setAnswers({});
        setIsSubmitted(false);
        setScore(0);
        setCurrentQuestionIndex(0);
        setShuffledQuestions(shuffleQuestions(questions));
    };
    return (<div className="max-w-2xl mx-auto py-2">
      
      <div className="mb-2 space-y-2.5">
        <div className="flex items-center justify-between">
             <div className="space-y-1">
             <h2 className="text-2xl font-bold tracking-tight">Knowledge Check</h2>
             <p className="text-muted-foreground text-sm">Question {currentQuestionIndex + 1} of {shuffledQuestions.length}</p>
           </div>
           {isSubmitted && (<div className={cn("px-4 py-1.5 rounded-full text-sm font-bold border", score >= passingPercentage ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-red-500/10 text-red-600 border-red-500/20")}>
                 {score >= passingPercentage ? "PASSED" : "FAILED"} ({score}%)
             </div>)}
        </div>
        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
             <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progress}%` }}/>
        </div>
      </div>

      
      <div className="relative min-h-[250px]">
        <Card className="border-none shadow-lg bg-card/60 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-0">
             <div className="p-5 space-y-2.5">
                <h3 className="text-xl font-medium leading-relaxed">
                  {currentQuestion.question}
                </h3>

                <div className="space-y-3">
                  {currentQuestion.answers.map((opt, optIdx) => {
            const isSelected = answers[currentQuestion.quizQuestionId] === optIdx;
            const correctIndex = currentQuestion.answers.findIndex(a => a.isCorrect);
            let stateStyles = "border-border hover:bg-accent/50 hover:border-primary/50";
            if (isSubmitted) {
                if (opt.isCorrect)
                    stateStyles = "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-300";
                else if (isSelected && !opt.isCorrect)
                    stateStyles = "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-300";
                else
                    stateStyles = "opacity-50 border-border";
            }
            else if (isSelected) {
                stateStyles = "border-primary bg-primary/5 ring-1 ring-primary";
            }
            return (<motion.div key={optIdx} whileHover={!isSubmitted ? { scale: 1.01 } : {}} whileTap={!isSubmitted ? { scale: 0.99 } : {}} onClick={() => handleSelect(optIdx)} className={cn("relative flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200", stateStyles)}>
                        <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors mr-4", isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30")}>
                           {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-current"/>}
                        </div>
                        <span className="font-medium">{opt.text}</span>

                        {isSubmitted && opt.isCorrect && (<CheckCircle2 className="absolute right-4 h-5 w-5 text-green-600"/>)}
                        {isSubmitted && isSelected && !opt.isCorrect && (<XCircle className="absolute right-4 h-5 w-5 text-red-600"/>)}
                      </motion.div>);
        })}
                </div>

                
                {isSubmitted && !currentQuestion.answers[answers[currentQuestion.quizQuestionId]]?.isCorrect && currentQuestion.explanation && (<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-muted/50 p-4 rounded-lg text-sm border border-border/50">
                        <div className="flex gap-2 text-muted-foreground">
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5"/>
                            <span><span className="font-semibold text-foreground">Explanation:</span> {currentQuestion.explanation}</span>
                        </div>
                    </motion.div>)}
             </div>
          </CardContent>
          
          
          <div className="p-4 bg-muted/20 border-t flex justify-between items-center">
             <Button variant="ghost" onClick={handlePrev} disabled={currentQuestionIndex === 0} className="hover:bg-background">
                Previous
             </Button>

             {isLastQuestion ? (isSubmitted ? (score >= passingPercentage ? (<Button onClick={() => onComplete(score, true)} className="gap-2">
                             Continue <ArrowRight className="h-4 w-4"/>
                         </Button>) : (<Button variant="outline" onClick={handleRetry} className="gap-2">
                             <RefreshCw className="h-4 w-4"/> Retry Quiz
                         </Button>)) : (<Button onClick={handleSubmit} className="px-5">Submit Quiz</Button>)) : (<Button onClick={handleNext} disabled={answers[currentQuestion.quizQuestionId] === undefined}>
                    Next Question
                 </Button>)}
          </div>
        </Card>
      </div>
    </div>);
}
