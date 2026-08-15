# Admin Form Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add client-side validation to every admin form and wire server-side `fieldErrors` from `getApiError` onto the matching RHF fields.

**Architecture:** All form dialogs use `react-hook-form` + `zod` + `zodResolver`. The canonical error helper is `getApiError` at `src/lib/api/errors.ts`. The fix is: (a) ensure schemas enforce the same constraints as backend DTOs, (b) convert any `mutate` calls to `mutateAsync` inside `try/catch`, (c) in the catch block call `getApiError` and map `fieldErrors` onto the form via `form.setError`. The `ResourcePage` component uses hand-rolled validation and needs its own enhanced check + server error mapping.

**Tech Stack:** Next.js 16, React 19, react-hook-form v7, zod v3, @tanstack/react-query v4, sonner (toasts)

---

## Shared error pattern (used in every RHF form task below)

```ts
import { toast } from "sonner";
import type { FieldPath } from "react-hook-form";
import { getApiError } from "@/lib/api/errors";

// Inside the async submit handler, after mutation:
} catch (err) {
  const apiError = getApiError(err);
  for (const [field, message] of Object.entries(apiError.fieldErrors)) {
    form.setError(field as FieldPath<Values>, { type: "server", message });
  }
  if (Object.keys(apiError.fieldErrors).length === 0) {
    toast.error(apiError.message);
  }
}
```

---

### Task 1: ResourcePage — enhanced validation + server error mapping

**Files:**
- Modify: `src/components/admin/resource-page.tsx`

- [ ] **Step 1: Add whitespace-only rejection for required fields**

In the `submit` function, after the existing required check loop, add:

```ts
for (const field of formFields) {
  if (!field.required) continue;
  const value = values[field.key];
  if (value === "" || value === null || value === undefined) {
    nextErrors[field.key] = `${field.label} is required`;
  } else if (
    field.type !== "boolean" &&
    field.type !== "number" &&
    typeof value === "string" &&
    value.trim() === ""
  ) {
    nextErrors[field.key] = `${field.label} is required`;
  }
}
```

Replace the existing required-check loop (lines 175-183) with the above.

- [ ] **Step 2: Add number + date type validation**

After the required-check, insert:

```ts
for (const field of formFields) {
  if (nextErrors[field.key]) continue;
  const value = values[field.key];
  if (
    field.type === "number" &&
    value !== "" &&
    value !== null &&
    value !== undefined
  ) {
    const n = Number(value);
    if (Number.isNaN(n)) {
      nextErrors[field.key] = `${field.label} must be a valid number`;
    }
  }
  if (
    field.type === "date" &&
    value !== "" &&
    value !== null &&
    value !== undefined
  ) {
    const d = new Date(String(value));
    if (Number.isNaN(d.getTime())) {
      nextErrors[field.key] = `${field.label} must be a valid date`;
    }
  }
}
```

- [ ] **Step 3: Add import and map server errors in onError callbacks**

At the top of the file add:
```ts
import { getApiError } from "@/lib/api/errors";
```

Change both `onError` callbacks in `submit` from:
```ts
onError: (err) => toast.error(messageOf(err, `Could not update the ${noun}`)),
```
to:
```ts
onError: (err) => {
  const apiError = getApiError(err, `Could not update the ${noun}`);
  const fieldErrs = apiError.fieldErrors;
  if (Object.keys(fieldErrs).length > 0) {
    setErrors(fieldErrs);
  } else {
    toast.error(apiError.message);
  }
},
```
(apply the same change for the create branch, with the appropriate fallback message).

---

### Task 2: CouponFormDialog — schema enhancements + server errors

**Files:**
- Modify: `src/features/coupons/components/coupon-form-dialog.tsx`

- [ ] **Step 1: Add date ordering and percentage cap to schema**

Replace the `couponFormSchema` definition to add a `superRefine`:

```ts
const couponFormSchema = z
  .object({
    couponCode: z
      .string()
      .min(3, "Coupon code must be at least 3 characters")
      .max(50)
      .transform((v) => v.toUpperCase()),
    discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
    discountValue: z.coerce.number().min(0.01, "Discount value must be greater than 0"),
    maxDiscountAmount: z.coerce.number().min(0).optional().nullable(),
    minPurchaseAmount: z.coerce.number().min(0).optional().nullable(),
    validFrom: z.string().min(1, "Valid from date is required"),
    validTill: z.string().min(1, "Valid till date is required"),
    usageLimit: z.coerce.number().min(1).optional().nullable(),
    usageLimitPerUser: z.coerce.number().min(1).max(100).default(1),
    categoryIds: z.array(z.string()).optional(),
    isActive: z.boolean().default(true),
  })
  .superRefine((v, ctx) => {
    if (
      v.validFrom &&
      v.validTill &&
      new Date(v.validTill) <= new Date(v.validFrom)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["validTill"],
        message: "Valid till must be after valid from",
      });
    }
    if (v.discountType === "PERCENTAGE" && v.discountValue > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["discountValue"],
        message: "Percentage discount cannot exceed 100",
      });
    }
  });
```

- [ ] **Step 2: Wire server errors**

Add `import { toast } from "sonner";` and `import { getApiError } from "@/lib/api/errors";` and `import type { FieldPath } from "react-hook-form";` to imports.

Replace the empty `catch {}` in `onSubmit` with:

```ts
} catch (err) {
  const apiError = getApiError(err);
  for (const [field, message] of Object.entries(apiError.fieldErrors)) {
    form.setError(field as FieldPath<CouponFormValues>, { type: "server", message });
  }
  if (Object.keys(apiError.fieldErrors).length === 0) {
    toast.error(apiError.message);
  }
}
```

---

### Task 3: Auth forms — server error wiring

**Files:**
- Modify: `src/app/(unauthenticated)/login/page.tsx`
- Modify: `src/app/(unauthenticated)/signup/page.tsx`
- Modify: `src/app/(unauthenticated)/forgot-password/page.tsx`
- Modify: `src/app/(unauthenticated)/reset-password/page.tsx`

- [ ] **Step 1: Login page — add field errors from setError**

The login page uses `form.register` (not `Form`/`FormField`). `form.setError` still works. Change `handleFormSubmit` from:
```ts
function handleFormSubmit(data: LoginFormData) {
  login.mutateAsync(data).catch((error: unknown) => {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Login failed. Please check your credentials.";
    toast.error(errorMessage);
  });
}
```
to:
```ts
function handleFormSubmit(data: LoginFormData) {
  login.mutateAsync(data).catch((err: unknown) => {
    const apiError = getApiError(err, "Login failed. Please check your credentials.");
    for (const [field, message] of Object.entries(apiError.fieldErrors)) {
      form.setError(field as FieldPath<LoginFormData>, { type: "server", message });
    }
    if (Object.keys(apiError.fieldErrors).length === 0) {
      toast.error(apiError.message);
    }
  });
}
```

Add `import { getApiError } from "@/lib/api/errors";` and `import type { FieldPath } from "react-hook-form";` to imports. Destructure `form` from `useForm` (currently uses destructuring, so add `setError` to the destructure or keep `form` as a variable).

Actually the login page uses destructured `{ register, handleSubmit, formState: { errors } }`. We need to also destructure `setError` or use the form object. Change to also return `setError`:

```ts
const {
  register,
  handleSubmit,
  setError,
  formState: { errors },
} = useForm<LoginFormData>({
  resolver: zodResolver(loginSchema),
});
```

And in `handleFormSubmit`:
```ts
function handleFormSubmit(data: LoginFormData) {
  login.mutateAsync(data).catch((err: unknown) => {
    const apiError = getApiError(err, "Login failed. Please check your credentials.");
    for (const [field, message] of Object.entries(apiError.fieldErrors)) {
      setError(field as FieldPath<LoginFormData>, { type: "server", message });
    }
    if (Object.keys(apiError.fieldErrors).length === 0) {
      toast.error(apiError.message);
    }
  });
}
```

- [ ] **Step 2: Signup page — same pattern**

Add `getApiError` and `FieldPath` imports. Add `setError` to the useForm destructure. Change `handleFormSubmit` to use `getApiError` and `setError`.

- [ ] **Step 3: Forgot password page — setError for email field**

Add `getApiError` and `FieldPath` imports. Add `setError` to the useForm destructure. Change the `useEffect` error handling to use `getApiError` and show field errors.

Replace the error useEffect:
```ts
useEffect(() => {
  if (forgotPassword.isError) {
    const apiError = getApiError(forgotPassword.error, "Failed to send reset email. Please try again.");
    for (const [field, message] of Object.entries(apiError.fieldErrors)) {
      setError(field as FieldPath<ForgotPasswordFormData>, { type: "server", message });
    }
    if (Object.keys(apiError.fieldErrors).length === 0) {
      toast.error(apiError.message);
    }
  }
}, [forgotPassword.isError, forgotPassword.error, setError]);
```

- [ ] **Step 4: Reset password page — setError for newPassword field**

Same pattern as forgot password.

---

### Task 4: CMS form dialogs — server error wiring (all use mutateAsync)

**Files:**
- Modify: `src/features/cms/components/faq-form-dialog.tsx`
- Modify: `src/features/cms/components/testimonial-form-dialog.tsx`
- Modify: `src/features/cms/components/why-choose-form-dialog.tsx`
- Modify: `src/features/cms/components/banner-form-dialog.tsx`

For each of these, the `onSubmit` uses `await ...mutateAsync(...)` but has no try/catch. The fix is to wrap in try/catch and apply the shared error pattern.

- [ ] **Step 1: FaqFormDialog**

Add `import { toast } from "sonner";`, `import { getApiError } from "@/lib/api/errors";`, `import type { FieldPath } from "react-hook-form";`.

Wrap `onSubmit` body in try/catch:
```ts
const onSubmit = async (values: Values) => {
  try {
    const payload = {
      question: values.question.trim(),
      answer: values.answer.trim(),
      displayOrder: values.displayOrder,
      isActive: values.isActive,
    };
    if (isEditing && faq) {
      await update.mutateAsync({ id: faq.faqId, dto: payload });
    } else {
      await create.mutateAsync(payload);
    }
    onOpenChange(false);
  } catch (err) {
    const apiError = getApiError(err);
    for (const [field, message] of Object.entries(apiError.fieldErrors)) {
      form.setError(field as FieldPath<Values>, { type: "server", message });
    }
    if (Object.keys(apiError.fieldErrors).length === 0) {
      toast.error(apiError.message);
    }
  }
};
```

- [ ] **Step 2: TestimonialFormDialog** — same pattern applied to `onSubmit`

- [ ] **Step 3: WhyChooseFormDialog** — same pattern applied to `onSubmit`

- [ ] **Step 4: BannerFormDialog** — wrap the `onSubmit` async function body in try/catch

Add toast + getApiError + FieldPath imports, wrap in try/catch.

---

### Task 5: Book + Category forms — server error wiring

**Files:**
- Modify: `src/features/books/components/book-form-dialog.tsx`
- Modify: `src/features/categories/admin/category-form-dialog.tsx`

- [ ] **Step 1: BookFormDialog**

BookFormDialog uses `update.mutate(...)` and `create.mutate(...)` with `{ onSuccess }`. Convert to `mutateAsync` with try/catch.

Add `import { toast } from "sonner";`, `import { getApiError } from "@/lib/api/errors";`, `import type { FieldPath } from "react-hook-form";`.

Convert `handleSubmitForm` from:
```ts
if (isEditing && book) {
  update.mutate({ id: book.bookId, dto: payload }, {
    onSuccess: () => onOpenChange(false),
  });
} else {
  create.mutate(payload, {
    onSuccess: () => onOpenChange(false),
  });
}
```
to:
```ts
try {
  if (isEditing && book) {
    await update.mutateAsync({ id: book.bookId, dto: payload });
  } else {
    await create.mutateAsync(payload);
  }
  onOpenChange(false);
} catch (err) {
  const apiError = getApiError(err);
  for (const [field, message] of Object.entries(apiError.fieldErrors)) {
    form.setError(field as FieldPath<Values>, { type: "server", message });
  }
  if (Object.keys(apiError.fieldErrors).length === 0) {
    toast.error(apiError.message);
  }
}
```

Also make `handleSubmitForm` async: `async function handleSubmitForm(values: Values) {`.

- [ ] **Step 2: CategoryFormDialog**

CategoryFormDialog's `onSubmit` already uses `await ...mutateAsync(...)` but with no try/catch. Wrap in try/catch per shared pattern.

Add `import { toast } from "sonner";`, `import { getApiError } from "@/lib/api/errors";`, `import type { FieldPath } from "react-hook-form";`.

---

### Task 6: User / Company / Enrollment edit dialogs — server error wiring

**Files:**
- Modify: `src/features/users/components/edit-user-dialog.tsx`
- Modify: `src/features/companies/components/edit-company-dialog.tsx`
- Modify: `src/features/enrollments/components/edit-enrollment-dialog.tsx`

All three have a try/catch with empty or swallowed errors. Replace the catch body with the shared error pattern.

- [ ] **Step 1: EditUserDialog**

Add `import { toast } from "sonner";`, `import { getApiError } from "@/lib/api/errors";`, `import type { FieldPath } from "react-hook-form";`.

Replace `} catch { /* toast handled in hook */ }` with:
```ts
} catch (err) {
  const apiError = getApiError(err);
  for (const [field, message] of Object.entries(apiError.fieldErrors)) {
    form.setError(field as FieldPath<z.infer<typeof formSchema>>, { type: "server", message });
  }
  if (Object.keys(apiError.fieldErrors).length === 0) {
    toast.error(apiError.message);
  }
}
```

- [ ] **Step 2: EditCompanyDialog** — same pattern

- [ ] **Step 3: EditEnrollmentDialog** — same pattern

---

### Task 7: Batch forms — convert mutate→mutateAsync + server error wiring

**Files:**
- Modify: `src/features/batches/components/batch-form-dialog.tsx`
- Modify: `src/features/batches/components/session-form-dialog.tsx`
- Modify: `src/features/batches/components/quiz-form-dialog.tsx`
- Modify: `src/features/batches/components/announcement-form-dialog.tsx`
- Modify: `src/features/batches/components/resource-form-dialog.tsx`
- Modify: `src/features/batches/components/question-form-dialog.tsx`
- Modify: `src/features/batches/components/subject-form-dialog.tsx`

For each: add `import { toast } from "sonner";`, `import { getApiError } from "@/lib/api/errors";`, `import type { FieldPath } from "react-hook-form";`. Convert `mutate` to `mutateAsync` and wrap in try/catch. Apply shared error pattern.

- [ ] **Step 1: BatchFormDialog** — `handleSubmitForm` uses `update.mutate` and `create.mutate`. Make it async, convert to mutateAsync + try/catch.

- [ ] **Step 2: SessionFormDialog** — `onSubmit` uses `update.mutate` and `create.mutate`. Same conversion.

- [ ] **Step 3: QuizFormDialog** — `onSubmit` uses `update.mutate` and `create.mutate`. Same conversion.

- [ ] **Step 4: AnnouncementFormDialog** — `onSubmit` uses `update.mutate` and `create.mutate`. Same conversion.

- [ ] **Step 5: ResourceFormDialog** — `onSubmit` uses `update.mutate` and `create.mutate`. Same conversion.

- [ ] **Step 6: QuestionFormDialog** — `onSubmit` uses `update.mutate` and `create.mutate`. Same conversion.

- [ ] **Step 7: SubjectFormDialog** — `onSubmit` uses `update.mutate` and `create.mutate`. Same conversion.

---

### Task 8: ServiceFormDialog — convert mutate + server errors

**Files:**
- Modify: `src/features/cms/components/service-form-dialog.tsx`

- [ ] **Step 1: Convert and wire errors**

Add `import { toast } from "sonner";`, `import { getApiError } from "@/lib/api/errors";`, `import type { FieldPath } from "react-hook-form";`. Make `handleSubmitForm` async, convert mutate→mutateAsync, add try/catch.

---

### Task 9: EnrollStudentsDialog — wire getApiError

**Files:**
- Modify: `src/features/batches/components/enroll-students-dialog.tsx`

- [ ] **Step 1: Replace raw error.message with getApiError**

Add `import { getApiError } from "@/lib/api/errors";`.

In `handleSubmit`'s catch block, replace:
```ts
} catch (err) {
  const msg = err instanceof Error ? err.message : "Failed to enroll";
  setError(msg);
}
```
with:
```ts
} catch (err) {
  const apiError = getApiError(err, "Failed to enroll");
  setError(apiError.message);
}
```

---

### Task 10: LessonEditorDialog — add title required validation

**Files:**
- Modify: `src/features/courses/components/lesson-editor-dialog.tsx`

- [ ] **Step 1: Add title validation state and check**

Add `import { getApiError } from "@/lib/api/errors";`.

Add state: `const [titleError, setTitleError] = useState<string | null>(null);`

In `handleSave`, add a guard before the mutation:
```ts
const handleSave = async () => {
  if (!lessonId) return;
  setTitleError(null);
  if (title.trim() === "") {
    setTitleError("Title is required");
    return;
  }
  try {
    await updateLessonMutation.mutateAsync({ ... });
    // ... rest
  } catch (err) {
    const apiError = getApiError(err, "Failed to update lesson.");
    toast.error(apiError.message);
  }
};
```

- [ ] **Step 2: Render title error**

Under the title Input, add:
```tsx
{titleError && (
  <p className="text-xs text-destructive">{titleError}</p>
)}
```

---

### Task 11: Typecheck + build verification

- [ ] **Step 1: Run typecheck**

```bash
cd D:/projects/groedu/frontend/admin && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Run build**

```bash
cd D:/projects/groedu/frontend/admin && npx next build
```

Expected: successful build.
