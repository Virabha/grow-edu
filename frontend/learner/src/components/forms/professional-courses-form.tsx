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
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

const professionalCoursesSchema = z.object({
  // Personal Information
  fullName: z.string().min(2, "Full name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["Male", "Female", "Other"], { message: "Please select gender" }),
  mobileNumber: z.string().regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit mobile number"),
  emailAddress: z.string().email("Please enter a valid email address"),
  
  // Address Details
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pinCode: z.string().regex(/^\d{6}$/, "Please enter a valid 6-digit PIN code"),
  
  // Educational Qualification
  highestQualification: z.enum(["Intermediate / 12th", "Diploma", "Graduate", "Post Graduate"], {
    message: "Please select highest qualification",
  }),
  degreeCompleted: z.enum(["Yes", "No"], { message: "Please select if degree is completed" }),
  yearOfPassOut: z.string().min(4, "Please enter year of pass out"),
  collegeUniversityName: z.string().min(2, "College/University name is required"),
  
  // Course Category Selection
  courseCategory: z.enum([
    "Data Science with Gen AI",
    "Data Engineering with Gen AI",
    "Full Stack Python Development",
    "Full Stack Java Development",
    "Mobile App Development – Flutter/ React Native/Swift",
    "Finance Management",
    "Business Management",
    "Human Resource Management",
    "Sales and Marketing",
    "Digital Marketing",
    "Course on Demand",
  ], { message: "Please select a course" }),
  customCourseDescription: z.string().optional(),
  
  // Mode of Training
  modeOfTraining: z.enum(["Online"], { message: "Please select mode of training" }),
  
  // Work Experience
  hasWorkExperience: z.enum(["Yes", "No"], { message: "Please select if you have work experience" }),
  companyName: z.string().optional(),
  roleDesignation: z.string().optional(),
  yearsOfExperience: z.string().optional(),
});

type ProfessionalCoursesFormData = z.infer<typeof professionalCoursesSchema>;

interface ProfessionalCoursesFormProps {
  serviceTitle: string;
  onSuccess?: () => void;
}

export function ProfessionalCoursesForm({ serviceTitle, onSuccess }: ProfessionalCoursesFormProps) {
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
  } = useForm<ProfessionalCoursesFormData>({
    resolver: zodResolver(professionalCoursesSchema),
    defaultValues: {
      modeOfTraining: "Online",
      degreeCompleted: "No",
      hasWorkExperience: "No",
    },
  });

  const courseCategory = watch("courseCategory");
  const hasWorkExperience = watch("hasWorkExperience");
  const degreeCompleted = watch("degreeCompleted");

  const onSubmit = async (data: ProfessionalCoursesFormData) => {
    setIsSubmitting(true);
    try {
      // Format the message with all form data
      const message = `
Candidate Application Form for Professional Courses
Service: ${serviceTitle}

PERSONAL INFORMATION:
- Full Name: ${data.fullName}
- Date of Birth: ${data.dateOfBirth}
- Gender: ${data.gender}
- Mobile Number: ${data.mobileNumber}
- Email Address: ${data.emailAddress}

ADDRESS DETAILS:
- Address: ${data.address}
- City: ${data.city}
- State: ${data.state}
- PIN Code: ${data.pinCode}

EDUCATIONAL QUALIFICATION:
- Highest Qualification: ${data.highestQualification}
- Degree/Course Completed: ${data.degreeCompleted}
- Year of Pass Out: ${data.yearOfPassOut}
- College/University Name: ${data.collegeUniversityName}

COURSE SELECTION:
- Selected Course: ${data.courseCategory}
${data.customCourseDescription ? `- Custom Course Description: ${data.customCourseDescription}` : ""}

MODE OF TRAINING:
- Mode: ${data.modeOfTraining}

WORK EXPERIENCE:
- Has Work Experience: ${data.hasWorkExperience}
${data.hasWorkExperience === "Yes" && data.companyName ? `- Company Name: ${data.companyName}` : ""}
${data.hasWorkExperience === "Yes" && data.roleDesignation ? `- Role/Designation: ${data.roleDesignation}` : ""}
${data.hasWorkExperience === "Yes" && data.yearsOfExperience ? `- Years of Experience: ${data.yearsOfExperience}` : ""}
      `.trim();

      await submitContact.mutateAsync({
        name: data.fullName,
        email: data.emailAddress,
        mobile: data.mobileNumber,
        subject: `Application for ${data.courseCategory} - ${serviceTitle}`,
        message,
        courseInterested: data.courseCategory,
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
      <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
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

      {/* Personal Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">1. Personal Information (*)</h3>
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
        <h3 className="text-lg font-semibold border-b pb-2">2. Address Details (*)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="address">Address *</Label>
            <Input id="address" {...register("address")} placeholder="Enter your complete address" />
            {errors.address && <p className="text-sm text-destructive mt-1">{errors.address.message}</p>}
          </div>
          <div>
            <Label htmlFor="city">City *</Label>
            <Input id="city" {...register("city")} placeholder="Enter city" />
            {errors.city && <p className="text-sm text-destructive mt-1">{errors.city.message}</p>}
          </div>
          <div>
            <Label htmlFor="state">State *</Label>
            <Input id="state" {...register("state")} placeholder="Enter state" />
            {errors.state && <p className="text-sm text-destructive mt-1">{errors.state.message}</p>}
          </div>
          <div>
            <Label htmlFor="pinCode">PIN Code *</Label>
            <Input id="pinCode" {...register("pinCode")} placeholder="6-digit PIN code" maxLength={6} />
            {errors.pinCode && <p className="text-sm text-destructive mt-1">{errors.pinCode.message}</p>}
          </div>
        </div>
      </div>

      {/* Educational Qualification */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">3. Educational Qualification (*)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Highest Qualification *</Label>
            <Select
              value={watch("highestQualification") || ""}
              onValueChange={(value) => setValue("highestQualification", value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select qualification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Intermediate / 12th">Intermediate / 12th</SelectItem>
                <SelectItem value="Diploma">Diploma</SelectItem>
                <SelectItem value="Graduate">Graduate</SelectItem>
                <SelectItem value="Post Graduate">Post Graduate</SelectItem>
              </SelectContent>
            </Select>
            {errors.highestQualification && <p className="text-sm text-destructive mt-1">{errors.highestQualification.message}</p>}
          </div>
          <div>
            <Label>Degree/Course Completed *</Label>
            <Select
              value={watch("degreeCompleted") || ""}
              onValueChange={(value) => setValue("degreeCompleted", value as "Yes" | "No")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Yes">Yes</SelectItem>
                <SelectItem value="No">No</SelectItem>
              </SelectContent>
            </Select>
            {errors.degreeCompleted && <p className="text-sm text-destructive mt-1">{errors.degreeCompleted.message}</p>}
          </div>
          <div>
            <Label htmlFor="yearOfPassOut">Year of Pass Out *</Label>
            <Input id="yearOfPassOut" type="number" {...register("yearOfPassOut")} placeholder="YYYY" min="1950" max="2025" />
            {errors.yearOfPassOut && <p className="text-sm text-destructive mt-1">{errors.yearOfPassOut.message}</p>}
          </div>
          <div>
            <Label htmlFor="collegeUniversityName">College/University Name *</Label>
            <Input id="collegeUniversityName" {...register("collegeUniversityName")} placeholder="Enter college/university name" />
            {errors.collegeUniversityName && <p className="text-sm text-destructive mt-1">{errors.collegeUniversityName.message}</p>}
          </div>
        </div>
      </div>

      {/* Course Category Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">4. Course Category Selection</h3>
        <div>
          <Label>Select Course *</Label>
          <Select
            value={watch("courseCategory") || ""}
            onValueChange={(value) => setValue("courseCategory", value as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a course" />
            </SelectTrigger>
            <SelectContent>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Software Engineering</div>
              <SelectItem value="Data Science with Gen AI">Data Science with Gen AI</SelectItem>
              <SelectItem value="Data Engineering with Gen AI">Data Engineering with Gen AI</SelectItem>
              <SelectItem value="Full Stack Python Development">Full Stack Python Development</SelectItem>
              <SelectItem value="Full Stack Java Development">Full Stack Java Development</SelectItem>
              <SelectItem value="Mobile App Development – Flutter/ React Native/Swift">Mobile App Development – Flutter/ React Native/Swift</SelectItem>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Business Management</div>
              <SelectItem value="Finance Management">Finance Management</SelectItem>
              <SelectItem value="Business Management">Business Management</SelectItem>
              <SelectItem value="Human Resource Management">Human Resource Management</SelectItem>
              <SelectItem value="Sales and Marketing">Sales and Marketing</SelectItem>
              <SelectItem value="Digital Marketing">Digital Marketing</SelectItem>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Other</div>
              <SelectItem value="Course on Demand">Course on Demand (Custom Program)</SelectItem>
            </SelectContent>
          </Select>
          {errors.courseCategory && <p className="text-sm text-destructive mt-1">{errors.courseCategory.message}</p>}
        </div>
        {courseCategory === "Course on Demand" && (
          <div>
            <Label htmlFor="customCourseDescription">Describe the course you want to learn</Label>
            <textarea
              id="customCourseDescription"
              {...register("customCourseDescription")}
              className="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              placeholder="Please describe the course you are looking for..."
            />
          </div>
        )}
      </div>

      {/* Mode of Training */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">5. Mode of Training</h3>
        <div>
          <Label>Mode *</Label>
          <Select
            value={watch("modeOfTraining") || ""}
            onValueChange={(value) => setValue("modeOfTraining", value as "Online")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Online">Online</SelectItem>
            </SelectContent>
          </Select>
          {errors.modeOfTraining && <p className="text-sm text-destructive mt-1">{errors.modeOfTraining.message}</p>}
        </div>
      </div>

      {/* Work Experience */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">6. Work Experience (If Any)</h3>
        <div>
          <Label>Do you have prior work experience? *</Label>
          <Select
            value={watch("hasWorkExperience") || ""}
            onValueChange={(value) => setValue("hasWorkExperience", value as "Yes" | "No")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Yes">Yes</SelectItem>
              <SelectItem value="No">No</SelectItem>
            </SelectContent>
          </Select>
          {errors.hasWorkExperience && <p className="text-sm text-destructive mt-1">{errors.hasWorkExperience.message}</p>}
        </div>
        {hasWorkExperience === "Yes" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="companyName">Company Name</Label>
              <Input id="companyName" {...register("companyName")} placeholder="Enter company name" />
            </div>
            <div>
              <Label htmlFor="roleDesignation">Role/Designation</Label>
              <Input id="roleDesignation" {...register("roleDesignation")} placeholder="Enter role/designation" />
            </div>
            <div>
              <Label htmlFor="yearsOfExperience">Years of Experience</Label>
              <Input id="yearsOfExperience" type="number" {...register("yearsOfExperience")} placeholder="Enter years" min="0" />
            </div>
          </div>
        )}
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
