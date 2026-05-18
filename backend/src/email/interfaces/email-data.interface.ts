export interface WelcomeEmailData {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}

export interface VerifyEmailData {
  firstName?: string | null;
  email: string;
  verificationUrl: string;
}

export interface ForgotPasswordEmailData {
  firstName?: string | null;
  email: string;
  resetUrl: string;
}

export interface ResetPasswordConfirmationEmailData {
  firstName?: string | null;
  email: string;
}

export interface PasswordChangedEmailData {
  firstName?: string | null;
  email: string;
}

export interface PaymentConfirmationEmailData {
  firstName?: string | null;
  email: string;
  paymentId: string;
  amount: string;
  currency: string;
  items: Array<{
    name: string;
    type: 'COURSE' | 'SECTION';
  }>;
  receiptUrl?: string;
}

export interface EnrollmentConfirmationEmailData {
  firstName?: string | null;
  email: string;
  courseTitle: string;
  courseSlug: string;
  enrollmentDate: Date;
}

export interface CourseCompletionEmailData {
  firstName?: string | null;
  email: string;
  courseTitle: string;
  courseSlug: string;
  completedDate: Date;
}

export interface VideoEncodingCompleteEmailData {
  firstName?: string | null;
  email: string;
  lessonTitle: string;
  courseTitle: string;
  courseSlug: string;
  lessonId: string;
}

export interface VideoEncodingFailedEmailData {
  firstName?: string | null;
  email: string;
  lessonTitle: string;
  courseTitle: string;
  courseSlug: string;
  lessonId: string;
  errorMessage: string;
}

export interface RoleChangeEmailData {
  firstName?: string | null;
  email: string;
  newRole: string;
  oldRole: string;
}

export interface CourseApprovedEmailData {
  firstName?: string | null;
  email: string;
  courseId: string;
  courseTitle: string;
  reviewNotes?: string | null;
  publish: boolean;
}

export interface CourseRejectedEmailData {
  firstName?: string | null;
  email: string;
  courseId: string;
  courseTitle: string;
  rejectionReason: string;
}

export interface CourseChangesRequestedEmailData {
  firstName?: string | null;
  email: string;
  courseId: string;
  courseTitle: string;
  reviewNotes: string;
}

