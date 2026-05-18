"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useSubmitContact } from "@/lib/hooks/use-contact";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

const iitNeetSchema = z.object({
  // Student Information
  fullName: z.string().min(2, "Full name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["Male", "Female", "Other"], { message: "Please select gender" }),
  mobileNumber: z.string().regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit mobile number"),
  emailAddress: z.string().email("Please enter a valid email address"),
  
  // Address Details
  address: z.string().min(5, "Address is required").optional(),
  city: z.string().min(2, "City is required").optional(),
  state: z.string().min(2, "State is required").optional(),
  pinCode: z.string().regex(/^\d{6}$/, "Please enter a valid 6-digit PIN code").optional(),
  
  // Academic Information
  boardOfEducation: z.enum(["CBSE", "ICSE", "State Board"], {
    message: "Please select board of education",
  }),
  schoolName: z.string().min(2, "School name is required"),
  currentClass: z.enum(["Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"], {
    message: "Please select current class",
  }),
  lastAcademicPercentage: z.string().min(1, "Please enter last academic percentage/grade"),
  
  // Program Selection
  examPreparation: z.enum(["IIT JEE", "NEET"], { message: "Please select exam preparation" }),
  programSelection: z.string().min(1, "Please select a program"),
  preferredMode: z.enum(["Online", "Offline"], { message: "Please select preferred mode" }),
  
  // Subject Selection
  subjectSelection: z.enum(["PCB", "PCM"]).optional(),
  
  // Parent/Guardian Details
  parentGuardianName: z.string().min(2, "Parent/Guardian name is required"),
  parentOccupation: z.string().min(2, "Occupation is required"),
  parentContactNumber: z.string().regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit mobile number"),
  parentEmailAddress: z.string().email("Please enter a valid email address").optional(),
  
  // Declaration
  studentSignature: z.string().min(1, "Student signature is required"),
  parentSignature: z.string().min(1, "Parent/Guardian signature is required"),
  declarationDate: z.string().min(1, "Date is required"),
});

type IITNeetFormData = z.infer<typeof iitNeetSchema>;

interface IITNeetFormProps {
  serviceTitle: string;
  onSuccess?: () => void;
}

const PROGRAM_OPTIONS = {
  "IIT JEE": [
    "IIT- JEE Long Term Course (Mains + Advanced) Class 11th and Class 12th",
    "IIT- JEE Short Term Six Months Course (Mains + Advanced) Class 11th and Class 12th",
    "IIT- JEE Foundation Course",
    "IIT- JEE Foundation Course Class 6th",
    "IIT- JEE Foundation Course Class 7th",
    "IIT- JEE Foundation Course Class 8th",
    "IIT- JEE Foundation Course Class 9th",
    "IIT- JEE Foundation Course Class 10th",
    "Test Series – Online",
    "Doubt Desk Support",
  ],
  "NEET": [
    "NEET Long Term(One Year) Course Class 11th and Class 12th",
    "NEET Short Term(Six Months) Course Class 11th and Class 12th",
    "NEET Foundation Course",
    "NEET Foundation Course 6th Class",
    "NEET Foundation Course 7th Class",
    "NEET Foundation Course 8th Class",
    "NEET Foundation Course 9th Class",
    "NEET Foundation Course 10th Class",
    "Test Series – Online",
    "Doubt Desk Support",
  ],
};

export function IITNeetForm({ serviceTitle, onSuccess }: IITNeetFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const submitContact = useSubmitContact();

  useEffect(() => {
    if (submitStatus !== "success") return;
    const timer = setTimeout(() => onSuccess?.(), 2500);
    return () => clearTimeout(timer);
  }, [submitStatus, onSuccess]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<IITNeetFormData>({
    resolver: zodResolver(iitNeetSchema),
    defaultValues: {
      preferredMode: "Online",
    },
  });

  const examPreparation = watch("examPreparation");
  const currentClass = watch("currentClass");
  const programSelection = watch("programSelection");
  
  // Determine which subject options to show based on exam selection
  const showSubjectSelection = examPreparation && programSelection && (
    programSelection.includes("Long Term") ||
    programSelection.includes("Short Term") ||
    programSelection.includes("Foundation Course")
  );

  const onSubmit = async (data: IITNeetFormData) => {
    // Validate subject selection if required
    if (showSubjectSelection && !data.subjectSelection) {
      toast.error("Please select a subject combination");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const message = `
Candidate Application Form - IIT-JEE / NEET Programs
Service: ${serviceTitle}

STUDENT INFORMATION:
- Full Name: ${data.fullName}
- Date of Birth: ${data.dateOfBirth}
- Gender: ${data.gender}
- Mobile Number: ${data.mobileNumber}
- Email Address: ${data.emailAddress}

ADDRESS DETAILS:
${data.address ? `- Address: ${data.address}` : ""}
${data.city ? `- City: ${data.city}` : ""}
${data.state ? `- State: ${data.state}` : ""}
${data.pinCode ? `- PIN Code: ${data.pinCode}` : ""}

ACADEMIC INFORMATION:
- Board of Education: ${data.boardOfEducation}
- School Name: ${data.schoolName}
- Current Class: ${data.currentClass}
- Last Academic Percentage/Grade: ${data.lastAcademicPercentage}

PROGRAM SELECTION:
- Exam Preparation: ${data.examPreparation}
- Selected Program: ${data.programSelection}
- Preferred Mode: ${data.preferredMode}

${data.subjectSelection ? `SUBJECT SELECTION:
- Subject Combination: ${data.subjectSelection} ${data.subjectSelection === "PCB" ? "(Physics, Chemistry, Biology - NEET, Medical)" : "(Physics, Chemistry, Mathematics - IIT-JEE, Engineering)"}` : ""}

PARENT/GUARDIAN DETAILS:
- Parent/Guardian Name: ${data.parentGuardianName}
- Occupation: ${data.parentOccupation}
- Contact Number: ${data.parentContactNumber}
${data.parentEmailAddress ? `- Email Address: ${data.parentEmailAddress}` : ""}

DECLARATION:
- Student Signature: ${data.studentSignature}
- Parent/Guardian Signature: ${data.parentSignature}
- Date: ${data.declarationDate}
      `.trim();

      await submitContact.mutateAsync({
        name: data.fullName,
        email: data.emailAddress,
        mobile: data.mobileNumber,
        subject: `Application for ${data.programSelection} - ${serviceTitle}`,
        message,
        courseInterested: data.programSelection,
        role: "Student",
      });

      setSubmitStatus("success");
    } catch (error) {
      setSubmitStatus("error");
      console.error("Form submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };


  if (submitStatus === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle2 className="h-9 w-9 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-xl font-semibold">Application Submitted!</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Thank you for your application. We&apos;ll review it and contact you soon.
        </p>
        <Button variant="outline" size="sm" onClick={() => onSuccess?.()}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {submitStatus === "error" && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
          <XCircle className="h-5 w-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive">
            Failed to submit application. Please check your details and try again.
          </p>
        </div>
      )}

      {/* Student Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">1. Student Information (*)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="fullName">Full Name *</Label>
            <Input id="fullName" {...register("fullName")} placeholder="Enter your full name" />
            {errors.fullName && <p className="text-sm text-destructive mt-1">{errors.fullName.message}</p>}
          </div>
          <div>
            <Label htmlFor="dateOfBirth">Date of Birth *</Label>
            <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
            {errors.dateOfBirth && <p className="text-sm text-destructive mt-1">{errors.dateOfBirth.message}</p>}
          </div>
          <div>
            <Label>Gender *</Label>
            <Select value={watch("gender") || ""} onValueChange={(value) => setValue("gender", value as "Male" | "Female" | "Other")}>
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.gender && <p className="text-sm text-destructive mt-1">{errors.gender.message}</p>}
          </div>
          <div>
            <Label htmlFor="mobileNumber">Mobile Number *</Label>
            <Input id="mobileNumber" type="tel" {...register("mobileNumber")} placeholder="10-digit mobile number" maxLength={10} />
            {errors.mobileNumber && <p className="text-sm text-destructive mt-1">{errors.mobileNumber.message}</p>}
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="emailAddress">Email Address *</Label>
            <Input id="emailAddress" type="email" {...register("emailAddress")} placeholder="Enter your email" />
            {errors.emailAddress && <p className="text-sm text-destructive mt-1">{errors.emailAddress.message}</p>}
          </div>
        </div>
      </div>

      {/* Address Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">2. Address Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" {...register("address")} placeholder="Enter your complete address" />
            {errors.address && <p className="text-sm text-destructive mt-1">{errors.address.message}</p>}
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Input id="city" {...register("city")} placeholder="Enter city" />
            {errors.city && <p className="text-sm text-destructive mt-1">{errors.city.message}</p>}
          </div>
          <div>
            <Label htmlFor="state">State</Label>
            <Input id="state" {...register("state")} placeholder="Enter state" />
            {errors.state && <p className="text-sm text-destructive mt-1">{errors.state.message}</p>}
          </div>
          <div>
            <Label htmlFor="pinCode">PIN Code</Label>
            <Input id="pinCode" {...register("pinCode")} placeholder="6-digit PIN code" maxLength={6} />
            {errors.pinCode && <p className="text-sm text-destructive mt-1">{errors.pinCode.message}</p>}
          </div>
        </div>
      </div>

      {/* Academic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">3. Academic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Board of Education *</Label>
            <Select
              value={watch("boardOfEducation") || ""}
              onValueChange={(value) => setValue("boardOfEducation", value as "CBSE" | "ICSE" | "State Board")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select board" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CBSE">CBSE</SelectItem>
                <SelectItem value="ICSE">ICSE</SelectItem>
                <SelectItem value="State Board">State Board</SelectItem>
              </SelectContent>
            </Select>
            {errors.boardOfEducation && <p className="text-sm text-destructive mt-1">{errors.boardOfEducation.message}</p>}
          </div>
          <div>
            <Label htmlFor="schoolName">School Name *</Label>
            <Input id="schoolName" {...register("schoolName")} placeholder="Enter school name" />
            {errors.schoolName && <p className="text-sm text-destructive mt-1">{errors.schoolName.message}</p>}
          </div>
          <div>
            <Label>Current Class *</Label>
            <Select
              value={watch("currentClass") || ""}
              onValueChange={(value) => setValue("currentClass", value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Class 6">Class 6</SelectItem>
                <SelectItem value="Class 7">Class 7</SelectItem>
                <SelectItem value="Class 8">Class 8</SelectItem>
                <SelectItem value="Class 9">Class 9</SelectItem>
                <SelectItem value="Class 10">Class 10</SelectItem>
                <SelectItem value="Class 11">Class 11</SelectItem>
                <SelectItem value="Class 12">Class 12</SelectItem>
              </SelectContent>
            </Select>
            {errors.currentClass && <p className="text-sm text-destructive mt-1">{errors.currentClass.message}</p>}
          </div>
          <div>
            <Label htmlFor="lastAcademicPercentage">Last Academic Percentage / Grade *</Label>
            <Input id="lastAcademicPercentage" {...register("lastAcademicPercentage")} placeholder="e.g., 85% or A+" />
            {errors.lastAcademicPercentage && <p className="text-sm text-destructive mt-1">{errors.lastAcademicPercentage.message}</p>}
          </div>
        </div>
      </div>

      {/* Program Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">4. Program Selection</h3>
        <div>
          <Label>Exam Preparation *</Label>
          <Select
            value={watch("examPreparation") || ""}
            onValueChange={(value) => {
              setValue("examPreparation", value as "IIT JEE" | "NEET");
              setValue("programSelection", ""); // Reset program selection when exam changes
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select exam preparation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="IIT JEE">IIT JEE</SelectItem>
              <SelectItem value="NEET">NEET</SelectItem>
            </SelectContent>
          </Select>
          {errors.examPreparation && <p className="text-sm text-destructive mt-1">{errors.examPreparation.message}</p>}
        </div>
        {examPreparation && (
          <div>
            <Label>Select Program *</Label>
            <Select
              value={watch("programSelection") || ""}
              onValueChange={(value) => setValue("programSelection", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a program" />
              </SelectTrigger>
              <SelectContent>
                {PROGRAM_OPTIONS[examPreparation].map((program) => (
                  <SelectItem key={program} value={program}>
                    {program}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.programSelection && <p className="text-sm text-destructive mt-1">{errors.programSelection.message}</p>}
          </div>
        )}
        <div>
          <Label>Preferred Mode *</Label>
          <Select
            value={watch("preferredMode") || ""}
            onValueChange={(value) => setValue("preferredMode", value as "Online" | "Offline")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Online">Online</SelectItem>
              <SelectItem value="Offline">Offline</SelectItem>
            </SelectContent>
          </Select>
          {errors.preferredMode && <p className="text-sm text-destructive mt-1">{errors.preferredMode.message}</p>}
        </div>
      </div>

      {/* Subject Selection */}
      {showSubjectSelection && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">5. Subject Selection</h3>
          <div>
            <Label>Subject Combination {showSubjectSelection ? "*" : ""}</Label>
            <Select
              value={watch("subjectSelection") || ""}
              onValueChange={(value) => setValue("subjectSelection", value as "PCB" | "PCM")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select subject combination" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PCB">PCB – Physics, Chemistry, Biology (NEET, Medical)</SelectItem>
                <SelectItem value="PCM">PCM – Physics, Chemistry, Mathematics (IIT-JEE, Engineering)</SelectItem>
              </SelectContent>
            </Select>
            {errors.subjectSelection && <p className="text-sm text-destructive mt-1">{errors.subjectSelection.message}</p>}
          </div>
        </div>
      )}

      {/* Parent/Guardian Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">6. Parent / Guardian Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="parentGuardianName">Parent / Guardian Name *</Label>
            <Input id="parentGuardianName" {...register("parentGuardianName")} placeholder="Enter parent/guardian name" />
            {errors.parentGuardianName && <p className="text-sm text-destructive mt-1">{errors.parentGuardianName.message}</p>}
          </div>
          <div>
            <Label htmlFor="parentOccupation">Occupation *</Label>
            <Input id="parentOccupation" {...register("parentOccupation")} placeholder="Enter occupation" />
            {errors.parentOccupation && <p className="text-sm text-destructive mt-1">{errors.parentOccupation.message}</p>}
          </div>
          <div>
            <Label htmlFor="parentContactNumber">Contact Number *</Label>
            <Input id="parentContactNumber" type="tel" {...register("parentContactNumber")} placeholder="10-digit mobile number" maxLength={10} />
            {errors.parentContactNumber && <p className="text-sm text-destructive mt-1">{errors.parentContactNumber.message}</p>}
          </div>
          <div>
            <Label htmlFor="parentEmailAddress">Email Address</Label>
            <Input id="parentEmailAddress" type="email" {...register("parentEmailAddress")} placeholder="Enter email (optional)" />
            {errors.parentEmailAddress && <p className="text-sm text-destructive mt-1">{errors.parentEmailAddress.message}</p>}
          </div>
        </div>
      </div>

      {/* Declaration */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">7. Declaration</h3>
        <div className="bg-muted/50 p-4 rounded-md mb-4">
          <p className="text-sm mb-4">I hereby declare that the information provided above is true and correct.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="studentSignature">Student Signature *</Label>
              <Input id="studentSignature" {...register("studentSignature")} placeholder="Enter your full name as signature" />
              {errors.studentSignature && <p className="text-sm text-destructive mt-1">{errors.studentSignature.message}</p>}
            </div>
            <div>
              <Label htmlFor="parentSignature">Parent / Guardian Signature *</Label>
              <Input id="parentSignature" {...register("parentSignature")} placeholder="Enter parent/guardian full name" />
              {errors.parentSignature && <p className="text-sm text-destructive mt-1">{errors.parentSignature.message}</p>}
            </div>
            <div>
              <Label htmlFor="declarationDate">Date *</Label>
              <Input id="declarationDate" type="date" {...register("declarationDate")} />
              {errors.declarationDate && <p className="text-sm text-destructive mt-1">{errors.declarationDate.message}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4">
        <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Application"
          )}
        </Button>
      </div>
    </form>
  );
}
