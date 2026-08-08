# Security Audit — groEdu Platform

> Last updated: 2026-05-30
> Auditor: Claude Code (Anthropic)
> Scope: Full stack — NestJS backend + Next.js learner + Next.js admin

Legend: ✅ Fixed | ⚠️ In progress | ❌ Open | 🔒 Accepted risk

---

## CRITICAL

### C-1 — Storage upload endpoint accepts any key from any user ❌ → ✅ Fixed
**File:** `backend/src/storage/storage.controller.ts:61`
**Risk:** Any authenticated user can call `POST /storage/upload` with a key belonging to another user (e.g., `videos/{otherUserId}/...`), overwriting their course videos or profile images.
**Fix:** Validate that the `key` supplied to the upload endpoint starts with the requesting user's `userId`. Added `@UseGuards(JwtAuthGuard)` explicitly + userId prefix check.

---

### C-2 — Manual QR payment endpoints still active (dead but exploitable) ⚠️
**File:** `backend/src/payment/payment.controller.ts`
**Risk:** The manual-QR flow (`createManualQRPayment`, `uploadPaymentProof`, `approvePayment`, `rejectPayment`, `getPendingReview`, `GET /qr-settings` [public]) is still fully live despite the REFACTOR_TODO claiming it was removed. `GET /qr-settings` is `@Public()` — no auth required. A malicious actor can still create fake MANUAL_QR payments and attempt to get them approved.
**Fix:** Remove all manual-QR controller routes and service methods after PhonePe integration is confirmed stable. Until then, gate `createPayment` behind a feature flag or restrict it.
**Status:** Deferred — blocked on PhonePe sandbox confirmation.

---

## HIGH

### H-1 — Admin middleware does not check JWT expiry ❌ → ✅ Fixed
**File:** `frontend/admin/src/middleware.ts:55`
**Risk:** The admin Next.js middleware decodes the JWT cookie but only checks `payload.role`. It never validates `payload.exp`. An expired token grants continued access to all admin/instructor/corporate routes until the backend rejects an API call. A stolen expired token passes the route guard silently.
**Fix:** Added `isExpired` check matching the learner middleware pattern. Expired tokens are now deleted and redirected to `/login`.

### H-2 — Auth cookies missing `Secure` flag (sent over HTTP) ❌ → ✅ Fixed
**File:** `frontend/learner/src/lib/store/auth-store.ts:55`, `frontend/admin/src/features/auth/hooks/use-auth.ts:34`
**Risk:** Auth JWT cookies are set without the `Secure` attribute. On any non-HTTPS connection (local dev, misconfigured prod, public Wi-Fi) the token is transmitted in plaintext and can be intercepted.
**Fix:** Added `; Secure` to all auth cookie `set` operations. Both admin and learner.

### H-3 — Auth cookies missing `HttpOnly` flag (XSS token theft) 🔒 Accepted risk
**File:** Both auth stores
**Risk:** Cookies set via `document.cookie` are JavaScript-readable. Any XSS vulnerability (however unlikely in a React app) can exfiltrate the JWT.
**Accepted risk:** The current auth architecture requires client-side cookie reading (Zustand rehydration, `getCookie` calls). Making cookies `HttpOnly` requires moving to a server-issued cookie flow and a `/api/me` validation endpoint — a significant architectural change. Documented here for future hardening. React's default XSS protection makes exploitation difficult.

### H-4 — Video content can be freely screen-recorded without watermark ❌ → ✅ Fixed
**File:** `frontend/learner/src/components/ui/secure-video-player.tsx`
**Risk:** Paid course videos have no visible identifier. A learner can screen-record the full video without any trace linking it back to their account.
**Fix:** Added a rotating, semi-transparent watermark overlay on the player that displays the user's email. Position cycles every 15 seconds to cover different areas of the frame.

### H-5 — Common screenshot keyboard shortcuts not blocked on watch page ❌ → ✅ Fixed
**File:** `frontend/learner/src/app/(authenticated)/courses/[courseId]/watch/page.tsx`
**Risk:** PrtSc, Win+Shift+S, Ctrl+Shift+S, Ctrl+P key combinations enable silent screenshots and screen captures of course content.
**Fix:** Added `keydown` event listener on the watch page that intercepts and `preventDefault`s common capture shortcuts.

---

## MEDIUM

### M-1 — localStorage key mismatch after cookie rename ❌ → ✅ Fixed
**File:** `frontend/learner/src/lib/store/auth-store.ts:55`, `frontend/admin/src/features/auth/hooks/use-auth.ts:31`, `frontend/admin/src/lib/store/auth-store.ts`
**Risk:** After the cookie rename PR (`auth-token` → `learner-auth-token` / `admin-auth-token`), the localStorage key was left as `"auth-token"` in both apps. Stale orphaned tokens accumulate in localStorage under the old key and are never cleaned up on login or session changes.
**Fix:** Updated localStorage key to `"learner-auth-token"` (learner) and `"admin-auth-token"` (admin) everywhere. Also updated `removeItem` calls on logout.

### M-2 — `POST /storage/upload` has no explicit auth guard (relies on global APP_GUARD) ✅ Fixed in code structure
**File:** `backend/src/storage/storage.controller.ts:61`
**Risk:** The upload endpoint has no `@UseGuards(JwtAuthGuard)` decorator and no `@Public()`. It relies entirely on the global `APP_GUARD`. If the global guard is ever reorganised, this endpoint silently becomes public.
**Fix:** Added explicit `@UseGuards(JwtAuthGuard)` + `@CurrentUser()` + userId prefix validation.

### M-3 — `getCookie` builds regex from user-controlled name 🔒 Accepted risk
**File:** `frontend/learner/src/lib/store/auth-store.ts:27`
**Risk:** `new RegExp(`(?:^|; )${name}=([^;]*)`)` — if `name` ever contains regex metacharacters, the regex breaks. Currently `name` is always a hardcoded string literal, so not exploitable.
**Accepted risk:** Hardcoded cookie names mean no realistic attack surface. Noted for future maintenance.

### M-4 — Forgot-password timing oracle (slow path leaks user existence) ✅ Already fixed
**File:** `backend/src/auth/auth.service.ts`
**Fix:** Constant-time dummy `bcrypt.compare` on the "user not found" path. Already applied in a prior session.

### M-5 — Empty catch swallowing email errors ✅ Already fixed
**File:** `backend/src/auth/auth.service.ts`
**Fix:** All four `} catch {}` blocks now log via `Logger.warn`. Already applied.

### M-6 — Webhook secret comparison was plain string `!==` ✅ Already fixed
**File:** `backend/src/video-encoding/video-encoding.webhook.controller.ts`
**Fix:** `crypto.timingSafeEqual` comparison. Already applied.

### M-7 — Swagger UI exposed in production ✅ Already fixed
**File:** `backend/src/main.ts`
**Fix:** Gated behind `if (!configService.isProduction())`. Already applied.

---

## LOW

### L-1 — `SELECT *` on users table included password column in memory ✅ Already fixed
**File:** `backend/src/auth/auth.service.ts`
**Fix:** Explicit column projection (`userPublicColumns`) on all user reads. Already applied.

### L-2 — No rate limiting on auth endpoints ✅ Already fixed
**File:** `backend/src/app.module.ts`, `backend/src/auth/auth.controller.ts`
**Fix:** `@nestjs/throttler` installed, three tiers registered, auth endpoints individually throttled. Already applied.

### L-3 — No `helmet` security headers ✅ Already fixed
**File:** `backend/src/main.ts`
**Fix:** `helmet()` applied with production CSP. Already applied.

### L-4 — 50 MB JSON body limit (DoS vector) ✅ Already fixed
**File:** `backend/src/main.ts`
**Fix:** Dropped to 2 MB. Large uploads use CDN presigned URLs. Already applied.

### L-5 — No global JwtAuthGuard (opt-in per controller) ✅ Already fixed
**File:** `backend/src/app.module.ts`
**Fix:** `JwtAuthGuard` registered as `APP_GUARD`. Public routes use `@Public()`. Already applied.

### L-6 — DTO mass-assignment allows `emailVerified` self-promotion ✅ Already fixed
**File:** `backend/src/users/users.service.ts`
**Fix:** `emailVerified` and `role` gated behind `PLATFORM_ADMIN` check at both guard and DB-write level. Already applied.

### L-7 — Bunny Stream video IDs logged in plaintext
**File:** `backend/src/cdn/cdn.service.ts:38`
**Risk:** Video IDs logged on every playback request. Low impact — IDs aren't secret, signed URLs protect actual access.
**Status:** Accepted. Log level should be downgraded to `debug` in production.

---

## Content Theft Protection Summary

| Protection | Status | Notes |
|---|---|---|
| Signed CDN URLs (Bunny Stream token auth) | ✅ Active | 600 s expiry via SHA-256 HMAC |
| Right-click disabled on player | ✅ Active | `contextmenu` event prevented |
| CSS `select-none` / `user-select: none` | ✅ Active | Prevents drag-select of player |
| User email watermark overlay | ✅ Fixed | Rotating position, 15 s cycle |
| Screenshot keyboard shortcut blocking | ✅ Fixed | PrtSc, Win+Shift+S, Ctrl+P intercepted |
| DevTools detection | ❌ Open | Could add `devtools-detect` library |
| Picture-in-picture disabling | ❌ Open | `disablePictureInPicture` on iframe/video |
| Screen share detection | ❌ Open | Not reliably possible in browsers |
| DRM (Widevine/PlayReady) | ❌ Open | Requires Bunny Stream DRM add-on (paid) |

---

## Backend Endpoint Audit Status

| Controller | Auth Guard | Input Validated | N+1 Risk | Notes |
|---|---|---|---|---|
| `auth` | `@Public()` class | ✅ DTOs | ✗ | Throttled |
| `users` | Global JWT | ✅ DTOs | ✗ | Role gates on update/delete |
| `courses` | Global JWT + `@Public` on reads | ✅ DTOs | ⚠️ | search index TBD |
| `lessons` | `@UseGuards(JwtAuthGuard)` class | ✅ DTOs | ✗ | play/preview enrollment checked |
| `sections` | Global JWT | ✅ DTOs | ⚠️ | Reorder race condition noted |
| `payments` | Global JWT + `@Public` on webhook | ✅ DTOs | ✗ | QR endpoints pending removal |
| `storage` | Global JWT | ✅ DTOs | ✗ | Key binding fixed this session |
| `enrollments` | Global JWT | ✅ DTOs | ⚠️ | Corp-admin filter TBD |
| `categories` | Global JWT + `@Public` on reads | ✅ DTOs | ✗ | Audited |
| `books` | Global JWT + `@Public` on reads | ✅ DTOs | ✗ | Audited |
| `cms` | Global JWT + `@Public` on reads | ✅ DTOs | ✗ | Audited |
| `video-encoding/webhook` | Signature verified | ✅ `BunnyWebhookDto` | ✗ | `timingSafeEqual` |
| `contact` | `@Public()` class | ✅ DTOs | ✗ | Throttled 3/min |
| `subscribe` | `@Public()` class | ✅ DTOs | ✗ | Throttled 3/min |
| `teacher-applications` | `@Public()` on submit | ✅ DTOs | ✗ | Throttled 3/hr |

---

## Open Items (deferred)

1. **PhonePe sandbox round-trip** — Blocked on credentials. Provide `PHONEPE_MERCHANT_ID`, `PHONEPE_SALT_KEY`, `PHONEPE_SALT_INDEX`, `PHONEPE_BASE_URL` to enable.
2. **Remove manual QR endpoints** — Delete `payment.controller.ts` routes + `payment.service.ts` methods for QR after PhonePe is confirmed stable in production.
3. **N+1 sweep** — `for-of + await` in lessons.reorder, coupons.service, etc. Bounded loops acceptable for now; revisit when slow-query logs show latency.
4. **Index audit** — Add DB indexes on `eq(payments.userId, …)`, `eq(enrollments.userId, …)` foreign key columns.
5. **Corp-admin enrollment filter** — Verify `enrollments` endpoint scopes to company only for CORPORATE_ADMIN.
6. **Sections reorder race condition** — Two concurrent instructors editing section order; consider row-level locking.
7. **Cache layer audit** — Confirm which read-heavy endpoints actually use `AppCacheModule` and which mutations invalidate.
8. **DevTools detection** — Consider `devtools-detect` npm package on the watch page.
9. **Bunny Stream DRM** — For enterprise-grade protection, enable Widevine/PlayReady DRM on the Bunny account.
10. **HttpOnly cookie migration** — Move to server-set HttpOnly cookies with `/api/auth/me` validation endpoint. Requires significant frontend architecture change.
