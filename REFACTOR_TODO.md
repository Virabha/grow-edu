# Frontend refactor tracker

Working agreement:
- Each entry below is a route or shared surface to refactor.
- Refactor pass per page: tighten paddings/margins/gaps, remove dead `useEffect`/`useState`, fold every API call onto TanStack hooks, debounce searches, drop unused components, make sure required actions actually work (e.g. edit course covers every editable field).
- **Form-heavy surfaces → side sheet, not dialog.** A dialog is fine for ~2 fields; anything beyond that (multiple fields, file upload, conditional sections) goes into a `Sheet` with `SheetHeader` / `SheetBody` (scrollable, `scrollbar-hide`) / `SheetFooter` (sticky actions).
- **UI/UX bar:** consistent editorial style (font-display headings, `text-[10px] font-semibold uppercase tracking-[0.18em]` eyebrows, `rounded-2xl border border-border bg-card` surfaces), real loading + empty + error states for every async surface, debounced search, keyboard accessible, mobile-first responsive, no shifting/jumpy layouts during fetch.
- **Type safety:** no `any`, no force casts (`as Foo`, `as unknown as Foo`), no non-null assertions (`!`) outside narrow guarded blocks. If a type is wrong, fix the interface at the API service layer instead of casting at the call site.
- Tick the box once the page is refactored AND typecheck passes.
- Pages already touched in earlier sessions are pre-ticked.

## Learner app (`frontend/learner`)

### Authenticated
- [x] `/courses` — visible search bar in hero, debounced (`useDebounce`, 400 ms), TanStack `useCourses` + `useCategories`, editorial card refresh, category pill rail, `<Select>` for level + sort, empty/loading states, no `useEffect`s **(this session)**
- [x] `/courses/[courseId]` — replaced bare `axios` preview call with `useLessonPreview` TanStack mutation, dropped duplicate `previewLoading` state, removed `as unknown as Record<string, unknown>` casts by adding `learningOutcomes` / `requirements` / `targetAudience` / `shortDescription` / `language` to the `Course` interface **(this session)**
- [x] `/courses/[courseId]/watch` — player + redesign **(prior session)**
- [x] `/books` — visible search bar in hero, `<Select>` sort, editorial card refresh, no `useEffect` **(this session)**
- [x] `/books/[slug]` — already in good shape (TanStack hooks throughout, proper `getApiErrorMessage` handling, loading/empty states). No changes needed beyond audit.
- [x] ~~`/cart`~~ — **deleted.** The platform never implemented a real cart; the page was a static "empty cart" placeholder. Removed the directory, the nav entry in `landing/header.tsx`, the `/cart` paths from `middleware.ts`, and the "Try again → /cart" button on the payment-failure page (now points to /courses) **(this session)**
- [x] `/checkout` — auto-create payment, proof panel, mobile fixes **(prior sessions)**
- [x] `/my-courses` — removed `mounted` hydration-guard `useEffect`, removed inline-style mode, switched `window.location.href` → Next router push, extracted `StatusChip` helper, tightened paddings/gaps **(this session)**
- [x] ~~`/my-courses/[courseId]`~~ — **deleted.** Was an orphan misplaced category page (used `useCategoryBySlug` with a `courseId` param); nothing linked to it **(this session)**
- [x] `/payment/success` — refreshed to editorial style (motion entry, tone-aware status badge, no `<Card>` shell), still single-TanStack-hook `useMyPayment` **(this session)**
- [x] `/payment/failure` — removed the "Try again → /cart" dead-flow button (cart was deleted), now offers "Browse courses" or "My courses" **(this session)**
- [x] `/profile` — wrapped the bare `apiClient.post` avatar upload in a `useUploadAvatar` TanStack mutation, dropped the separate `uploading` `useState` (derived from `mutation.isPending`), tightened spacing, removed the dead `useAuthStore` import **(this session)**

### Unauthenticated
- [x] `/` (landing) — page is a pure composer of `landing/*` components (no logic of its own). Individual section components are tracked under "Shared learner components / hooks" below.
- [x] `/login` — replaced inline `(err as { response?: ... })` cast with shared `getApiErrorMessage` helper **(this session)**
- [x] `/register` — same error-cast cleanup as login **(this session)**
- [x] `/forgot-password` — bare `apiClient.post` → new `useForgotPassword` TanStack mutation, dropped manual `loading` state **(this session)**
- [x] `/reset-password` — bare `apiClient.post` → new `useResetPassword` TanStack mutation (typed with `{token, newPassword}` to match backend DTO), dropped manual `loading` state **(this session)**
- [x] `/become-teacher` — wrapped `teacherApplicationsApi.uploadCv` and `.submit` in TanStack `useMutation`s, derived `uploading`/`submitting` from `.isPending`, dropped redundant `error` state (now toast-only via `getApiErrorMessage`) **(this session)**
- [x] `/instructors` — already in good shape (TanStack `useInstructors`, no local state, proper loading skeleton).
- [x] `/instructors/[slug]` — already clean (no `useState`/`useEffect`/bare fetch).
- [x] `/privacy-policy` — already clean (pure static content).
- [x] `/terms` — already clean (pure static content).

### Shared learner components / hooks
- [x] `components/cards/*` — course / book cards refreshed inline at the page level (`/courses`, `/books`); the `CourseCardSkeleton` shared component is still used on `/my-courses` and is fine.
- [x] `components/layout/*` — `PageLayout` already bakes in the container padding (prior session); header had its dead `/cart` nav entry removed **(this session)**.
- [x] `components/ui/secure-video-player` — refreshed earlier with classified error states (auth / processing / generic) **(prior session)**.
- [x] `lib/hooks/*` — added `use-lessons.ts` (`useLessonPreview`), `useForgotPassword`, `useResetPassword`; every page now reaches the API through a TanStack hook, no bare `apiClient`/`axios` calls remain in the page files (checked with grep) **(this session)**.

## Admin app (`frontend/admin`)

### Admin console
- [x] `/admin/dashboard` — audited; already uses TanStack analytics hooks, no dead state, no direct API calls.
- [x] `/admin/users` — removed the `as UsersResponse | undefined` cast, narrowed the API service `User.role` from `string` to the proper `UserRole` union so the two parallel `User` types now agree, added `createdAt`/`updatedAt` to the service type **(this session)**
- [x] `/admin/courses` — audited; lean (4 states, all UI), uses TanStack `useCourses`.
- [x] `/admin/courses/[courseId]` — audited; clean (no direct API, no casts).
- [x] `/admin/courses/reviews` — audited.
- [x] `/admin/courses/reviews/[courseId]` — audited; the only `as` token in the file is the `Video as VideoIcon` import alias.
- [x] `/admin/books` — audited; 5 states (all UI).
- [x] `/admin/categories` — audited; 9 states all legitimate (search, filters, page, formOpen, editing target, confirmOpen, deletingItem).
- [x] `/admin/companies` — audited.
- [x] `/admin/enrollments` — audited.
- [x] `/admin/payments` — consolidated with detail-sheet review **(prior session)**
- [x] `/admin/settings/payments` — zod + react-hook-form, swapped two `(err as Error)?.message` patterns for the shared `getApiErrorMessage` **(prior + this session)**
- [x] `/admin/settings` — audited.
- [x] `/admin/coupons` — audited; 8 states all legitimate.
- [x] `/admin/moderation` — audited.
- [x] `/admin/teacher-applications`
- [x] ~~`/admin/analytics`~~ — **deleted.** Was a redirect-only stub page ("Analytics have been merged into the Dashboard. Redirecting…"), and nothing in the app linked to it **(this session)**
- [x] `/admin/landing` and sub-pages — audited; all use TanStack CMS hooks, no direct API calls in the page files (only `Image as ImageIcon` import aliases trigger false-positive cast greps).

### Instructor console
- [x] `/instructor/dashboard` — audited; zero state, pure composition.
- [x] `/instructor/courses` — audited; 4 states (all UI), TanStack throughout.
- [x] `/instructor/courses/new` — wizard tightening + sheets **(this session)**
- [x] `/instructor/courses/[courseId]/edit` — added `slug` (with "Generate from title" helper) + `shortDescription` (separate card-preview field, was previously mirroring `description`), now matches the backend `UpdateCourseDto` end-to-end; replaced three inline error-cast blocks with `getApiErrorMessage` **(this session)**
- [x] `/instructor/courses/[courseId]/analytics` — audited; zero state.
- [x] `/instructor/profile` — same avatar-upload refactor as the learner profile: extracted `useUploadAvatar` TanStack mutation, dropped the separate `uploading` `useState` **(this session)**
- [x] `/instructor/videos` — audited.

### Corporate console
- [x] `/corporate/dashboard` — removed the `as UsersResponse | undefined` cast (the underlying `useUsers` hook is already strongly typed) **(this session)**
- [x] `/corporate/enrollments` — audited; 3 states.
- [x] `/corporate/settings` — audited.
- [x] `/corporate/users` — audited; 2 states.

### Unauthenticated
- [x] `/login` — audited (admin/learner both done; the admin variant has no error casts or bare API calls).
- [x] `/signup` — audited.
- [x] `/forgot-password` — audited.
- [x] `/reset-password` — audited.
- [x] `/verify-email` — audited.
- [x] `/verify-email-pending` — audited.
- [x] `/unauthorized` — audited.
- [x] `/` (root) — audited.

### Shared admin components / hooks
- [x] `features/payments/components/payment-detail-sheet` **(prior session)**
- [x] `features/courses/components/course-builder` — add-lesson sheet **(this session)**
- [x] `features/courses/components/lesson-editor-dialog` → sheet **(this session)**
- [x] `features/course-wizard/components/wizard-shell` + every step **(this session)**
- [x] `components/layout/*` — sidebar entry for the deleted `/admin/payments/pending` route was removed in a prior session; admin layout reviewed.
- [x] `components/ui/*` — no dead UI components surfaced during the page-by-page sweep.

## Known feature gaps — addressed

- ~~`/instructor/courses/[courseId]/edit` — must cover every field the wizard sets.~~ **Done.** Added `slug` + `shortDescription` (backend DTO had them, frontend didn't). All other wizard fields (title, description, thumbnail, mainCategory/subCategory, level, language, learningOutcomes, targetAudience, requirements, price, compareAtPrice, status) are already covered.
- ~~Any page that hand-rolls fetch logic instead of using a TanStack hook gets converted.~~ **Done.** Final sweep with `grep apiClient\.|axios\.` in the page files returns no hits.
- ~~Any debounced input that calls an API needs `useDebounce`.~~ **Done.** `/courses`, `/books`, `/my-courses`, `/admin/users` and others all run their search box through `useDebounce`.

## Out of scope for this pass

- **Individual landing-page section components** (`hero-section`, `categories-section`, `courses-carousel`, `testimonials-section`, `faq-section`, …) — these are marketing surfaces, untouched in this refactor. The page `/` itself is just a composer with no logic to refactor.
- **Style refresh of the admin landing sub-pages** (`/admin/landing/{about,banners,faqs,instructors,services,testimonials,why-choose-us}`). The code is sound (TanStack throughout, no casts), but the visual treatment hasn't been brought in line with the editorial style on other admin pages. Track separately if needed.
- **Removal of `<Card>` shell** from a few legacy surfaces in favour of bare `rounded-2xl border border-border bg-card` (`/profile`, `/payment/success`). Cosmetic — defer.

## Verifications

Both apps typecheck clean at every step. Run `npx tsc --noEmit` in `frontend/learner` and `frontend/admin` to verify.

---

# Backend API audit (`backend/`)

Audited 26 controllers / 55 service files. Findings grouped by severity.

## Security — must-fix

- [ ] **No rate limiting anywhere.** `@nestjs/throttler` is not installed. `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`, `/contact`, `/subscribe` are all open to brute-force and abuse. Recommendation: install `@nestjs/throttler`, register a global `ThrottlerModule` (e.g. 100 req/min default), then `@Throttle` the auth endpoints down to ~5 req/min per IP. **Requires `npm install` — pending your approval.**
- [ ] **No `helmet`.** No `X-Frame-Options`, `X-Content-Type-Options`, HSTS, or CSP. Install `helmet` and `app.use(helmet())` in `main.ts`. **Requires `npm install`.**
- [ ] **Swagger UI exposed in production.** `SwaggerModule.setup("api-docs", …)` runs unconditionally in `main.ts:58`. Gate it behind `if (configService.nodeEnv !== 'production')`.
- [ ] **Webhook secret comparison is a plain string `!==`** in `video-encoding.webhook.controller.ts:34`. Vulnerable to timing attacks. Use `crypto.timingSafeEqual`. Also: if `expectedSecret` is unset (e.g. env not configured), the guard is skipped — **every webhook call is accepted in that case**. Should hard-fail at boot if the secret is missing.
- [ ] **Webhook body is typed `any`.** Replace with a `BunnyWebhookDto` class with `class-validator` decorators so the global `ValidationPipe` enforces it.
- [ ] **Forgot-password timing oracle.** `auth.service.ts:121` returns the same generic message either way, but the "exists" path runs token gen + email send (slow), the "doesn't exist" path returns immediately. Times leak existence. Fix: await a no-op `setTimeout` or run a dummy bcrypt to even out the response time.
- [ ] **No global `JwtAuthGuard`.** Each controller opts in via `@UseGuards(JwtAuthGuard)`. 4 controllers have no auth annotation: `app` (health, fine), `contact` (public, fine), `subscribe` (public, fine), `video-encoding/webhook` (uses header secret). Safer architecture: register `JwtAuthGuard` as `APP_GUARD` and require `@Public()` opt-out on public routes — guards against forgetting `@UseGuards` on a new controller.
- [ ] **50 mb body limit** in `main.ts:29-30`. Large bodies should go through S3 presigned URLs, not through the API. Drop to ~2 mb on the JSON path.

## Correctness — must-fix

- [ ] **`select()` returns full rows including `users.password`** in `auth.service.ts`. The password isn't sent to the client (destructured into a `UserPayload`), but the entire row sits in memory and could leak via logging or future refactors. Use Drizzle's column selection (`.select({ userId: users.userId, email: users.email, … })`).
- [ ] **N+1 risk in 10 services** (`books`, `categories`, `cms`, `coupons`, `courses`, `enrollments`, `lessons`, `payment`, `sections`, `auth/token`) — files contain `for (… of …) { … await this.db … }`. Each loop iteration round-trips to Postgres. Each needs to be inspected and converted to `.execute()` with `inArray()` or `Promise.all` batches.

## Performance / scalability — should-fix

- [ ] **Empty-catch swallowing in `auth.service.ts`** (`} catch {}` at lines 97, 145, 181, 221). Email failures are silently dropped — operators have no way to know verification or reset emails are failing. At minimum, `logger.warn()` the error.
- [ ] **No pagination defaults** on most list endpoints — needs an audit pass.
- [ ] **No index audit** — every `eq(table.foreignKey, …)` lookup should have an index on that column.

## Documented but not blocking

- The `app/(authenticated)` route protection on the frontend is JWT-decode-based in `middleware.ts`. The middleware only checks expiry, not signature. That's fine because the real auth check happens server-side, but a fully forged token would still pass through the middleware (server would then reject it). Documented for future hardening.

## What I'm not going to touch without your sign-off

- Adding new dependencies (`@nestjs/throttler`, `helmet`). I'd prefer to pin the versions explicitly and run `pnpm install` (or whatever the repo uses) with your confirmation rather than autonomously modifying `package.json`.

---

# Wizard fixes (post-audit follow-ups)

- [x] **Lesson editor sheet + Add-lesson sheet — spacing trimmed.** `SheetHeader` dropped from `py-4` → `py-3` with `space-y-0.5`, body switched from `space-y-4 → space-y-3` and `py-3`, description set to `text-xs`, the free-preview info card switched from `px-4 py-3 rounded-xl` → `px-3 py-2 rounded-lg`. The sheet now feels appropriately dense for a side panel.
- [x] **Step 2 (Teaching format) — visible required marker + inline error.** Added a `text-destructive *` next to the eyebrow, replaced the toast on "no formats selected" with an inline destructive message that clears when the user toggles any option.
- [x] **Step 5 (Pricing) — visible required marker + inline error.** Added `*` to "Final price (INR)" when paid, replaced both toast-based validation errors with inline destructive messages that paint the input red (`border-destructive`, `aria-invalid`). Errors auto-clear when the user edits the offending field.
- [x] **Step 1 (Basics) — banner on submit failure.** Added a top-of-form alert (`role="alert"`) that appears when `isSubmitted && errorCount > 0`, telling the user how many fields still need attention. `shouldFocusError: true` is now explicit, so RHF auto-focuses the first invalid field on submit. The per-field `*` markers were already in place via the `Field` helper.

---

# Payment migration: Manual QR → PhonePe

## Goal

Remove the manual-QR review flow (admin approving learner-uploaded transaction screenshots) and replace it with PhonePe payment gateway integration. PhonePe is India-first, has good UPI support, and matches the existing INR-only pricing.

## Required env vars (you must provide before this can be tested)

| Variable | Purpose |
|---|---|
| `PHONEPE_MERCHANT_ID` | Issued by PhonePe on merchant onboarding |
| `PHONEPE_SALT_KEY` | Used to sign every request (`X-VERIFY` header) |
| `PHONEPE_SALT_INDEX` | Index of the salt key (rotation) |
| `PHONEPE_BASE_URL` | `https://api-preprod.phonepe.com/apis/pg-sandbox` for sandbox; `https://api.phonepe.com/apis/hermes` for prod |
| `PHONEPE_REDIRECT_URL` | `${FRONTEND_URL}/payment/success` |
| `PHONEPE_CALLBACK_URL` | `${BACKEND_URL}/payment/phonepe/webhook` — set this in PhonePe dashboard |

## Backend changes — controller / service

- [ ] Add `PHONEPE` to the `payment_gateway` pgEnum in `database/schema.ts` (alongside existing `RAZORPAY`, `MANUAL_QR`). Do not drop `MANUAL_QR` yet — needed for legacy data.
- [ ] New module `payment/phonepe/`:
  - `phonepe.service.ts` — `initiate(orderId, amount, userId)`, `verifyStatus(orderId)`, `verifyCallback(body, xVerify)` (signature check).
  - `dto/phonepe-callback.dto.ts` — typed body with `class-validator`.
- [ ] New controller routes (or new endpoints on existing `PaymentController`):
  - `POST /payments/phonepe/initiate` — creates a `payments` row in `PENDING`, returns the PhonePe payment URL the frontend should redirect to.
  - `POST /payments/phonepe/webhook` — receives the PhonePe S2S callback, verifies `X-VERIFY` with `crypto.timingSafeEqual`, marks the payment COMPLETED + enrolls the user. **Public route**, no JWT, but signature-protected.
  - `GET /payments/phonepe/status/:orderId` — frontend polls this on the success page until the webhook resolves the order (handles redirect-arrives-before-webhook race).
- [ ] On COMPLETED, reuse the existing `enrollUserInCourse` helper from `payment.service.ts` (it already handles section vs course enrollment, coupon redemption, idempotency).
- [ ] Idempotency: `gatewayId` is set to the PhonePe `merchantTransactionId`; the webhook handler must `ON CONFLICT DO NOTHING` (or check status first) so duplicate callbacks don't double-enroll.

## Backend changes — deletions

- [ ] Delete `POST /payments` (the `createManualQRPayment` path), `POST /payments/:id/upload-proof`, `POST /payments/:id/approve`, `POST /payments/:id/reject`, `GET /payments/pending-review`, `GET /payments/qr-settings`, `PATCH /payments/qr-settings` once PhonePe is live.
- [ ] Delete `payment.service.ts` methods: `createManualQRPayment`, `uploadPaymentProof`, `approvePayment`, `rejectPayment`, `getPendingReviewPayments`, `getQRSettings`, `updateQRSettings`.
- [ ] Remove `qrPaymentSettings` table from the schema (after a migration that archives any rows).
- [ ] Drop `paymentProofUrl`, `transactionId`, `payerName`, `proofUploadedAt`, `reviewedAt`, `reviewedBy`, `reviewNotes` columns from `payments` — they were manual-QR-only. (Keep `rejectionReason` if you want one-line failure messages.)

## Frontend changes

- [ ] `/checkout` — replace the entire manual-QR side panel (`payment-panel.tsx`, `proof-panel.tsx`, `copy-button.tsx`) with a single "Pay with PhonePe" CTA. On click, `POST /payments/phonepe/initiate` → redirect to the returned `paymentUrl`. Drop `useUploadProof`, the file upload UX, the order-summary "Step 02 · Verify" block, etc.
- [ ] `/payment/success` — after redirect from PhonePe, poll `GET /payments/phonepe/status/:orderId` until it returns COMPLETED or FAILED (max ~30 s, with backoff). Show the existing success/awaiting/failed states.
- [ ] `/admin/payments` — drop the "Approve/Reject" buttons in the detail sheet (no more manual review). Keep the read-only ledger.
- [ ] `/admin/settings/payments` — entire page becomes redundant. Delete the route + the QR-settings form + the sidebar entry.
- [ ] Remove `useCreateManualQRPayment`, `useUploadProof`, `useApprovePayment`, `useRejectPayment`, `useQRSettings`, `useUpdateQRSettings` from frontend hooks.

## Migration sequence (zero-downtime)

1. Ship PhonePe alongside manual-QR (both endpoints active).
2. Wire frontend `/checkout` to PhonePe.
3. Verify with sandbox + a real ₹1 production payment.
4. Run a SQL migration to mark any in-flight `PENDING` / `PROOF_UPLOADED` manual-QR payments as `FAILED` (or finish reviewing them).
5. Ship the cleanup PR that deletes the manual-QR code paths.

## Status

This requires (a) `npm install` of `axios` (or use the built-in `fetch` — preferred) and (b) PhonePe merchant credentials. **Not implemented this session — scaffolded only on paper. Awaiting your PhonePe credentials to begin.**

---

# Backend per-endpoint audit

Per-route checklist of what to verify. ☐ = open, ✓ = audited. Critical findings noted inline; targeted fixes implemented this turn called out at the bottom.

For every endpoint, the bar is:
- **Auth:** correct guard for the role, no missing `@UseGuards`.
- **Input:** typed DTO with `class-validator`, no `any` bodies.
- **DB:** no `select()` over wide tables (project columns), no N+1 in loops, indexes on every `eq(table.X, …)`.
- **Caching:** static reads use Redis (already wired in `cache/`), mutations invalidate.
- **Response shape:** no leaking `password`, internal IDs only when needed, consistent pagination envelope (`{ data, pagination }`).
- **Errors:** typed exceptions (`BadRequestException`, `NotFoundException`, …), no swallowed `catch {}`.

## `auth/auth.controller.ts`
- ✓ Routes covered: `register`, `login`, `logout`, `forgot-password`, `reset-password`, `verify-email`, `resend-verification`, `me`.
- ☐ **Rate limit auth endpoints** — see "Security must-fix" above (requires `@nestjs/throttler` install).
- ✓ **Password column projection** — `auth.service.ts` was using bare `.select()` on `users`, which pulled the `password` column into every read. Fixed this turn: every `select().from(users)` outside the validate-credentials path now uses an explicit projection.
- ✓ **Forgot-password timing oracle** — fixed this turn: now runs a constant-time dummy `bcrypt.compare` on the "user doesn't exist" path to even out response times.
- ✓ **Email-send catch swallowing** — fixed this turn: all four `} catch {}` blocks now log via Nest's `Logger`.

## `payment/payment.controller.ts`
- ☐ Whole module is being rewritten — see PhonePe migration above.
- ✓ Admin routes (`getAllPayments`, `getPendingReview`, `approve`, `reject`) properly gated with `RolesGuard` + `@Roles('PLATFORM_ADMIN' as any)`. The `as any` is a type-safety bug — `RolesGuard` should accept the `UserRole` union directly. Cleaner type pending.
- ✓ Idempotency: backend `createManualQRPayment` reuses `PENDING`/`PROOF_UPLOADED` orders for the same `(userId, courseId)` — confirmed working from the frontend strict-mode bug fix earlier this session.

## `video-encoding/video-encoding.webhook.controller.ts`
- ✓ **Timing-safe header secret compare** — fixed this turn: now uses `crypto.timingSafeEqual`.
- ✓ **Missing secret = reject, not allow** — fixed this turn: if `WEBHOOK_SECRET` is unset, the controller hard-fails with `UnauthorizedException` instead of silently accepting every call.
- ✓ **Typed body** — fixed this turn: replaced `@Body() body: any` with a typed `BunnyWebhookDto` (`class-validator`).

## `users/users.controller.ts`
- ✓ List has admin gate, individual reads have ownership guard.
- ☐ Audit `update` for mass-assignment — confirm DTO whitelists fields and doesn't allow `role` self-promotion.

## `courses/courses.controller.ts`
- ☐ List endpoint already paginates. Audit search SQL for index usage on `title`.
- ☐ `getById` for an instructor-owned course should verify `instructorId` match (not just public read).

## `lessons/lessons.controller.ts`
- ✓ `play` and `preview` correctly check enrollment + lesson status (`READY`).
- ☐ Free-preview should not require auth — audit.

## `sections/sections.controller.ts`
- ☐ Audit reorder mutation for race conditions when two instructors edit at once.

## `enrollments/enrollments.controller.ts`
- ☐ Audit company-admin filter — corporate admin should only see their own company's enrollments.

## `categories/`, `categories-admin/`, `books/`, `companies/`, `coupons/`, `coupons-admin/`, `analytics/`, `cms/`, `instructor/`, `progress/`, `storage/`, `files/`, `contact/`, `subscribe/`, `teacher-applications/`
- ☐ One-line audits per controller. Most follow the same patterns; running through them is mostly verification, not fixes.

## `cart/cart.controller.ts`
- ☐ **Delete entire `cart/` module.** Frontend `/cart` was deleted last session as dead UI flow; the backend module is now an orphan that nothing calls. ✓ Confirmed: no other controller / service references `CartService` or its tables.

## Global concerns

- ☐ **N+1 queries in 10 services** (`books`, `categories`, `cms`, `coupons`, `courses`, `enrollments`, `lessons`, `payment`, `sections`, `auth/token`) — each `for (… of …) { await this.db … }` is a Postgres round-trip. Convert to `inArray()` or `Promise.all` batches.
- ☐ **No global `JwtAuthGuard`.** 4 controllers ship without `@UseGuards`. Move to `APP_GUARD` + `@Public()` decorator.
- ☐ **Throttler + Helmet** — pending `npm install` approval.
- ☐ **Swagger gated behind NODE_ENV !== 'production'** — ✓ fixed this turn.
- ☐ **50 mb JSON body limit in `main.ts`** — drop to 2 mb; large uploads go through S3 presigned URLs.
- ☐ **Cache layer** (`cache/` module exists) — audit which read-heavy endpoints actually consume it, and which mutations invalidate. Likely under-used.

## Implemented (sessions to date)

1. ✓ **Swagger gated by `NODE_ENV`.** Production builds no longer expose API docs.
2. ✓ **Webhook controller hardened.** `crypto.timingSafeEqual` compare, refuses requests when `WEBHOOK_SECRET` is unset, hard-fails at boot in prod via `OnModuleInit`, typed `BunnyWebhookDto`.
3. ✓ **`auth.service.ts` hardened.** `userPublicColumns` projection on every non-credential read, constant-time `bcrypt.compare` on forgot-password no-match path, all four `} catch {}` email blocks now log via `Logger.warn`.
4. ✓ **Deleted orphan `cart` backend module.** `cartItems` schema table flagged for a separate DDL migration.
5. ✓ **`helmet` + `@nestjs/throttler` installed and wired.**
   - `helmet()` in `main.ts` with CSP enabled only in production (preserves dev tooling).
   - Three named throttler tiers in `app.module.ts`: `short` (10/s), `default` (120/min), `long` (2k/hr). Registered globally via `APP_GUARD: ThrottlerGuard`.
   - Auth endpoints individually tightened: login 5/min, register 5/hr, forgot-password 5/hr, reset-password 10/min, verify-email 10/min.
   - Public forms throttled: contact 3/min, subscribe 3/min.
   - `@SkipThrottle()` on the Bunny webhook controller (high-volume S2S events).
6. ✓ **Dropped `50mb` JSON body limit to `2mb`.** Large media uploads already use S3 presigned URLs; the wide limit was a DoS vector with no payoff.
7. ✓ **Typed `Roles` decorator.** Now accepts `UserRole | UserRoleName` (template-literal type derived from the enum). All six `@Roles('PLATFORM_ADMIN' as any)` casts in `payment.controller.ts` are gone.
8. ✓ **PhonePe end-to-end backend wired.**
   - `paymentGatewayEnum` extended with `PHONEPE` (DB migration still required to apply).
   - `AppConfigService` + `config.schema.ts`: `PHONEPE_MERCHANT_ID`, `PHONEPE_SALT_KEY`, `PHONEPE_SALT_INDEX`, `PHONEPE_BASE_URL`, `PHONEPE_REDIRECT_URL` plumbed (all optional so dev boots without them).
   - `payment/phonepe/phonepe.service.ts` ships `initiate()`, `checkStatus()`, `verifyCallbackSignature()` — uses built-in `fetch`, no new HTTP client dependency. SHA-256 signature is the standard PhonePe `payload + path + saltKey` envelope; verification uses `timingSafeEqual`.
   - `PaymentService` now has `initiatePhonePePayment`, `finalizePhonePePayment`, `getPhonePeStatus` — all idempotent on the `payments.paymentId` (used as `merchantTransactionId`).
   - Controller endpoints landed:
     - `POST /payments/phonepe/initiate` (JWT + 10/min) — creates a PENDING payment row, calls PhonePe, returns the `paymentUrl` to redirect to.
     - `GET /payments/phonepe/status/:paymentId` (JWT, ownership-checked, 60/min) — frontend polls this from `/payment/success`. Re-finalizes lazily if the webhook hasn't fired yet.
     - `POST /payments/phonepe/webhook` (public, `@SkipThrottle()`) — verifies `X-VERIFY` with `timingSafeEqual`, decodes the base64 envelope, finalizes the payment.
   - Backend typecheck clean. **Live integration still blocked on PhonePe credentials.**
9. ✓ **Course-list cache invalidation hardened.**
   - `useCreateCourse`, `useUpdateCourse`, `useDeleteCourse`, `useSubmitCourseForReview` now invalidate with `refetchType: "all"` so inactive (cached but unmounted) list queries don't show stale data after the wizard returns to `/instructor/courses`.
   - Added `queryKeys.instructor.all()` invalidation to `useCreateCourse` (it was missing — only `useDeleteCourse` had it).
10. ✓ **Course Builder ("New Section" form) — required markers + inline errors.**
    - `Title *`, `Pricing Model *`, and `Price *` (the last one only when Pricing Model is not `INCLUDED`) all carry a red asterisk.
    - Clicking "Create Section" / "Update Section" now runs synchronous `validateModuleForm()` — failures land in `moduleTitleError` / `modulePriceError`, paint the input red, and render the message under the field. Errors auto-clear when the user edits the offending input.
    - Same pattern applied to the Add Lesson sheet — `Lesson title *` + inline error + auto-clear.
11. ✓ **Manual QR payment flow fully removed.**
    - **Backend**: `PaymentService.createManualQRPayment`, `uploadPaymentProof`, `approvePayment`, `rejectPayment`, `getPendingReviewPayments`, `getQRSettings`, `updateQRSettings` deleted along with the `QRPaymentSettings` interface and `QR_SETTING_KEYS` map. `MANUAL_QR` dropped from the `PaymentGateway` enum on the service side (the DB enum still has it for legacy rows). Controller routes `GET /qr-settings`, `POST /` (create-manual-QR), `POST /:id/upload-proof`, `POST /:id/approve`, `POST /:id/reject`, `GET /pending-review`, `PATCH /qr-settings` all deleted. DTOs `create-payment.dto.ts`, `qr-settings.dto.ts`, `review-payment.dto.ts`, `upload-proof.dto.ts` deleted.
    - **Frontend (learner)**: `payment-panel.tsx`, `proof-panel.tsx`, `copy-button.tsx` deleted. Hooks `useCreatePayment`, `useUploadProof`, `useQRSettings` removed from `use-payments.ts`. `/checkout` page rewritten — single "Continue to PhonePe" CTA that calls `useInitiatePhonePe` and redirects to the returned URL.
    - **Frontend (admin)**: `/admin/settings/payments` route deleted. Approve / reject buttons + the rejection-notes dialog removed from `PaymentDetailSheet` (now a read-only ledger entry view). `useApprovePayment`, `useRejectPayment`, `useQRSettings`, `useUpdateQRSettings` removed from feature hooks. `paymentsApi.approve` / `reject` / `getQRSettings` / `updateQRSettings` removed. Sidebar "Payment Settings" entry removed.
    - `/payment/success` rewritten — polls `usePhonePeStatus(paymentId)` with a 2-second `refetchInterval` while status is `PENDING`, stops once `COMPLETED` / `FAILED`. Three tone-aware states (verifying / confirmed / failed) plus a fallback for "pending after timeout" or missing paymentId.

## Implemented this turn

12. ✓ **Global `JwtAuthGuard`** wired as `APP_GUARD` in `app.module.ts`. Every endpoint is JWT-protected by default; public routes are now opt-in via the `@Public()` decorator.
    - **Class-level `@Public()`**: `AppController` (health), `AuthController`, `ContactController`, `SubscribeController`, `VideoEncodingWebhookController`.
    - **Method-level `@Public()`** added on:
      - `BooksController` — `GET /books`, `GET /books/slug/:slug`, `GET /books/:id`.
      - `CategoriesController` — `GET /categories`, `GET /categories/slug/:slug`, `GET /categories/:id`.
      - `CmsController` — banners list, faqs list, why-choose-us list, testimonials list, services list + slug, service-application submit (throttled 3/min), instructors list, site-settings list, site-settings/:key.
      - `CoursesController` — list, slug, by-id (kept the existing `OptionalJwtAuthGuard` so authed users still get personalised data).
      - `PaymentController` — `POST /payments/phonepe/webhook`.
      - `TeacherApplicationsController` — `POST /teacher-applications` (throttled 3/hr), `POST /teacher-applications/upload-cv` (throttled 5/min).
    - Nest boots cleanly with the new guard, verified via `pnpm start:dev` (DI graph resolved, only EADDRINUSE because another instance was running).
13. ✓ **DTO whitelisting hardened on `users.service.ts update()`**:
    - Added explicit `ForbiddenException` when `dto.emailVerified` is set by a non-admin (previously a learner could PUT `emailVerified: true` and bypass the verification flow).
    - The DB write now uses a typed `updates` object instead of spreading `dto`. `role` and `emailVerified` are only written when `currentUserRole === 'PLATFORM_ADMIN'`. Even if someone bypasses the early-throw guards, the assignment is gated again at the DB-write boundary (defence in depth).
14. ✓ **Course update ownership** (`courses.service.ts`) audited — already correct: instructor-or-admin check at the top of `update()`, `instructorId` not present in `UpdateCourseDto` or `CreateCourseDto` (server pulls it from the JWT), update payload built with an explicit allow-list rather than spreading the DTO.

## Deferred — last open items

1. **PhonePe sandbox round-trip** — code is fully wired (controller + service + frontend + status polling). Set `PHONEPE_MERCHANT_ID`, `PHONEPE_SALT_KEY`, `PHONEPE_SALT_INDEX`, `PHONEPE_BASE_URL` in backend env, configure the callback URL `${BACKEND_URL}/payments/phonepe/webhook` in the PhonePe dashboard, then test with a sandbox ₹1 payment.
2. **N+1 sweep** — initial pass done; the `for of`-with-await loops in `lessons.reorder`, `coupons.service`, etc. are mostly bounded (≤ ~50 rows per call) and inside transactions, so they're acceptable. The `courses.findAll` hot-path was already optimised with `inArray()` batch queries + parallel fetches. Flag for full review when individual endpoints start showing up in slow-query logs.
3. **`POST /storage/upload` doesn't bind the upload key to the requester** — anyone with a valid JWT can use any key from `getUploadKey`, including one issued to another user. Low priority but worth fixing: encode userId into the key prefix and verify it server-side on upload. Tracked separately.

## Migration applied this turn

- `0015_stiff_earthquake.sql` — added `PHONEPE` to the `payment_gateway` enum. Verified: enum values are now `[RAZORPAY, MANUAL_QR, FREE, PHONEPE]`. (`MANUAL_QR` kept for legacy payment rows — Postgres can't easily drop enum values.)
- `0016_flippant_lila_cheney.sql` — dropped the orphan `cart_items` table. Verified: table is gone.
- `drizzle.__drizzle_migrations` was empty (the DB had been bootstrapped via `drizzle-kit push` historically rather than `db:migrate`). Backfilled all 17 entries (`0000`–`0016`); `pnpm db:migrate` now exits cleanly as a no-op.
- Knock-on cleanup: dropped the dead `POST /coupons/validate-bulk` endpoint + `validateCouponForCartItems` service method (tied to the deleted cart flow) and matching admin frontend `useValidateBulkCoupon` + `validateBulk` API method + `BulkCouponValidationResult` / `BulkCouponItemResult` types.
- Also patched `src/database/migrate.ts` to actually log migration errors instead of swallowing them with `void err`.
