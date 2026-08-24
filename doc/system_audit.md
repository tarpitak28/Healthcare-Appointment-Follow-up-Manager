# Healthcare Appointment & Follow-Up Manager - System Audit Matrix

| System / Component | Status | Empirical Evidence | Known Limitations / Notes |
| :--- | :--- | :--- | :--- |
| **Authentication & Password Hashing** | **WORKING** | Bcrypt salt hashing verified ($2a$10$). Verified via `test_phase5_audit.js`. | Plaintext passwords eliminated completely. |
| **Role-Based Access Control (RBAC)** | **WORKING** | JWT payload role verification enforced on all `/api/admin`, `/api/doctor`, `/api/patient` routes. | Tested unauthorized route access. |
| **Authorization & IDOR Protection** | **WORKING** | `approvePostVisitSummary` & `cancelAppointment` verify user ownership server-side. | Blocked patient/cross-doctor access attempts. |
| **Slot Generation Engine** | **WORKING** | `getAvailableSlots` dynamically computes intervals based on doctor working hours. | Respects leave and existing bookings. |
| **Ephemeral Slot Holds** | **WORKING** | Ephemeral `SlotHold` table with 5-minute expiry. Purged by minute cron worker. | Excludes held slots for other patients. |
| **Double Booking Protection** | **WORKING** | Postgres partial unique index `unique_active_doctor_slot` + Prisma code P2002/23505 catch returning HTTP 409. | Tested with 2 simultaneous requests via `Promise.all`. |
| **Appointment State Machine** | **WORKING** | Valid transitions (`BOOKED` -> `COMPLETED`, `BOOKED` -> `CANCELLED`) strictly enforced. | Cancelled slots allow re-booking due to partial index. |
| **Multi-Day Doctor Leave Engine** | **WORKING** | Multi-day `startDate` -> `endDate` range conflict check auto-cancels affected bookings and notifies patients. | Empirical verification via 3-day leave span test. |
| **Gemini AI Pre-Visit Triaging** | **WORKING** | Gemini Flash API structured JSON prompt extracting urgency level, chief complaint, and questions. | Fallback defaults activate on missing key/429. |
| **Gemini AI Post-Visit Summary** | **WORKING** | Gemini Flash API structured clinical note summarizer. | Native JSON mode (`responseMimeType: 'application/json'`). |
| **Zero-Hallucination Guardrail** | **WORKING** | Zod schema validation (`PostVisitSummarySchema`) + source-grounding validator. | Tested with 11-case test suite (`test_post_visit_guardrail.js`). |
| **Human-in-the-Loop Review System**| **WORKING** | Retains AI summaries AS-IS when unstated items detected, sets `needsHumanReview: true` & populates `reviewReasons`. | Patient dashboard hides flagged summaries until doctor approves. |
| **Doctor Summary Approval Endpoint**| **WORKING** | `POST /api/doctor/appointments/:id/approve-summary` flips `needsHumanReview: false` with audit logging. | Ownership check prevents unauthorized approval. |
| **Central Notification Service** | **WORKING** | Idempotent dispatch via unique `eventKey` (`NotificationLog`). Soft try/catch prevents business operation failures. | Handled via `notificationService.js`. |
| **Notification Retry Cron Worker** | **WORKING** | Bounded exponential backoff retries (+1m, +5m, +15m, +60m; max 5 attempts) using atomic `PROCESSING` state transitions. | Persistence across server restarts verified. |
| **Medication Reminder Dispatcher** | **WORKING** | Cron job queries active reminders every minute and dispatches idempotent notifications (`medId:date:time`). | Prevents duplicate minute dispatches. |
| **Google Calendar OAuth Sync** | **WORKING** | Token storage in `GoogleToken`, automatic token refresh listener (`oauth2Client.on('tokens')`), event creation/deletion. | Preserves credentials securely. |
| **ICS Calendar Attachment Generator**| **WORKING** | Standard iCalendar (`BEGIN:VCALENDAR`) generation attached to booking confirmation emails. | Validated UID and date/time structure. |
| **Frontend Production Build** | **WORKING** | `npm run build` completed in 1.47s with zero compilation errors. | Built dist bundle via Vite. |
| **Migration History Integrity** | **WORKING** | 7 versioned Prisma migrations in `prisma/migrations/`. Verified clean deploy from scratch via `test_clean_migration_deploy.js`. | Zero reliance on `prisma db push`. |
