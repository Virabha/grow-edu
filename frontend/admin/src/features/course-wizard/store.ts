import { create } from 'zustand';
interface CourseWizardState {
    currentStep: number;
    courseId: string | null;
    courseTitle: string;
    totalSteps: number;
    isLoading: boolean;
    setStep: (step: number) => void;
    nextStep: () => void;
    prevStep: () => void;
    setCourseId: (id: string) => void;
    setCourseTitle: (title: string) => void;
    setLoading: (loading: boolean) => void;
    reset: () => void;
}
export const useCourseWizard = create<CourseWizardState>((set) => ({
    currentStep: 1,
    courseId: null,
    courseTitle: '',
    totalSteps: 8,
    isLoading: false,
    setStep: (step) => set({ currentStep: step }),
    nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, state.totalSteps) })),
    prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),
    setCourseId: (id) => set({ courseId: id }),
    setCourseTitle: (title) => set({ courseTitle: title }),
    setLoading: (loading) => set({ isLoading: loading }),
    reset: () => set({ currentStep: 1, courseId: null, courseTitle: '', isLoading: false }),
}));
