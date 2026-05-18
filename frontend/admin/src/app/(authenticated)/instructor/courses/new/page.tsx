"use client";
import { Suspense } from "react";
import { PageTransition } from "@/components/page-transition";
import { useCourseWizard } from "@/features/course-wizard/store";
import { StepBasics } from "@/features/course-wizard/components/step-basics";
import { StepTeachingFormat } from "@/features/course-wizard/components/step-teaching-format";
import { StepAudience } from "@/features/course-wizard/components/step-audience";
import { StepCurriculum } from "@/features/course-wizard/components/step-curriculum";
import { StepContent } from "@/features/course-wizard/components/step-content";
import { StepSettings } from "@/features/course-wizard/components/step-settings";
import { StepPricing } from "@/features/course-wizard/components/step-pricing";
import { StepReview } from "@/features/course-wizard/components/step-review";
import { motion, AnimatePresence } from "framer-motion";
import { BackButton } from "@/components/ui/back-button";
import { cn } from "@/lib/utils";

function CourseCreationContent() {
    const { currentStep, totalSteps, courseTitle } = useCourseWizard();
    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return <StepBasics />;
            case 2:
                return <StepTeachingFormat />;
            case 3:
                return <StepAudience />;
            case 4:
                return <StepCurriculum />;
            case 5:
                return <StepPricing />;
            case 6:
                return <StepContent />;
            case 7:
                return <StepSettings />;
            case 8:
                return <StepReview />;
            default:
                return <StepBasics />;
        }
    };
    const steps = [
        { title: "Basics" },
        { title: "Format" },
        { title: "Audience" },
        { title: "Curriculum" },
        { title: "Pricing" },
        { title: "Content" },
        { title: "Settings" },
        { title: "Review" },
    ];
    return (<PageTransition>
      <div className="min-h-[calc(100vh-4rem)] grid grid-cols-1 lg:grid-cols-12 gap-3 p-4 md:p-5 max-w-[1600px] mx-auto">
        
        <div className="hidden lg:block lg:col-span-3 xl:col-span-2 relative">
           <div className="sticky top-8 space-y-2.5">
              <div>
                <BackButton href="/instructor/courses" className="mb-2"/>
                <h1 className="text-2xl font-bold tracking-tight mb-2">Create Course</h1>
                <p className="text-muted-foreground text-sm">
                   {courseTitle || "Untitled Course"}
                </p>
              </div>
              
              <div className="relative border-l-2 border-muted pl-4 space-y-2.5">
                 {steps.map((step, index) => {
            const stepNum = index + 1;
            const isActive = stepNum === currentStep;
            const isCompleted = stepNum < currentStep;
            return (<div key={index} className="relative group">
                           
                           {(isActive || isCompleted) && (<motion.div layoutId="activeStepLine" className={cn("absolute -left-[18px] top-0 h-full w-[2px]", isCompleted ? "bg-primary" : "bg-primary")} transition={{ duration: 0.3 }}/>)}
                           
                           <div className={cn("flex items-center gap-3 text-sm transition-colors duration-200", isActive ? "text-primary font-semibold" :
                    isCompleted ? "text-foreground" : "text-muted-foreground")}>
                               <span className={cn("flex items-center justify-center w-6 h-6 rounded-full border text-[10px] bg-background", isActive ? "border-primary text-primary" :
                    isCompleted ? "border-primary bg-primary text-primary-foreground" : "border-muted")}>
                                   {isCompleted ? "✓" : stepNum}
                               </span>
                               {step.title}
                           </div>
                        </div>);
        })}
              </div>
           </div>
        </div>

        
        <div className="lg:col-span-9 xl:col-span-10 flex flex-col">
            <div className="lg:hidden mb-3">
                <div className="flex justify-between items-center mb-2">
                  <BackButton href="/instructor/courses"/>
                  <span className="text-sm font-medium text-muted-foreground">Step {currentStep} of {totalSteps}</span>
                </div>
                
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={currentStep} initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.98 }} transition={{ duration: 0.3, ease: "easeOut" }} className="w-full max-w-4xl mx-auto">
                {renderStep()}
              </motion.div>
            </AnimatePresence>
        </div>
      </div>
    </PageTransition>);
}

export default function CourseCreationPage() {
  return (
    <Suspense fallback={<div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-5"><div className="animate-pulse rounded-md bg-muted h-8 w-48" /></div>}>
      <CourseCreationContent />
    </Suspense>
  );
}
