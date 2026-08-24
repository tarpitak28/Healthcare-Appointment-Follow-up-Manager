# AI Assistant Project Context & Master System Prompt

> **Purpose**: Master operational context and mandatory constraints for AI agents working on the Healthcare Appointment & Follow-up Manager codebase.

---

## 1. Core Architectural Constraints & Mandatory Rules

1. **NEVER USE `prisma db push`**:
   - The repository has 7 versioned Prisma migrations in `prisma/migrations/`.
   - All schema changes MUST use `npx prisma migrate dev --create-only`, inspect SQL, and apply via `npx prisma migrate deploy`.
   - Standalone `apply_index.js` scripts or `db push` are prohibited.

2. **Authoritative Clinical Grounding & Human Review**:
   - Doctor-entered clinical notes and prescriptions are authoritative over AI output.
   - The AI output (`generatePostVisitSummary`) is validated by `postVisitGuardrail.js` using Zod schema validation and source-grounding text normalizers.
   - When grounding detects unstated diagnoses, medications, or instructions, the summary is retained AS-IS, `needsHumanReview` is set to `true`, and `reviewReasons` are recorded.
   - Flagged summaries remain hidden on the patient dashboard until explicitly approved by the doctor via `POST /api/doctor/appointments/:id/approve-summary`.

3. **Notification Fault Isolation & Reliability**:
   - All system emails (booking, cancellation, doctor leave, post-visit, medication reminders) are managed by `notificationService.js` and logged to `NotificationLog`.
   - Duplicate dispatches are prevented by unique `eventKey` idempotency indexing.
   - Business operations (booking, cancellation, consultation completion) MUST succeed regardless of SMTP availability.
   - Bounded exponential retries (+1m, +5m, +15m, +60m; max 5 attempts) are executed by `cronService.js` every minute using atomic `PROCESSING` state transitions.

4. **Hard Database Concurrency Enforcement**:
   - Double-booking is prevented at the PostgreSQL database level via partial unique index `unique_active_doctor_slot` on `("doctorProfileId", "appointmentDate", "startTime") WHERE status IN ('BOOKED', 'COMPLETED')`.
   - Catching Postgres code `23505` / Prisma code `P2002` returns a clean HTTP `409 Conflict`.
   - Ephemeral `SlotHold` table reserves slots for 5 minutes and auto-purges via minute cron worker, independently of server memory.

5. **Server-Side Authorization & IDOR Defense**:
   - Resource endpoints (e.g. `:appointmentId`, `:doctorId`) enforce server-side user ownership and role checks (`PATIENT`, `DOCTOR`, `ADMIN`).
   - Frontend route guards are secondary; server-side verification is mandatory.

6. **Secrets & Logging Hygiene**:
   - API keys, OAuth tokens, and SMTP credentials must never be logged or exposed to the frontend.
   - Error messages must be sanitized via `sanitizeError()` before storing in `NotificationLog`.

---

## 2. Data Schema Quick Reference

- **User Roles**: `ADMIN`, `DOCTOR`, `PATIENT`
- **Appointment Statuses**: `BOOKED`, `COMPLETED`, `CANCELLED`
- **Notification Statuses**: `PENDING`, `PROCESSING`, `SENT`, `FAILED`
- **Notification Types**: `BOOKING_CONFIRMATION`, `APPOINTMENT_CANCELLATION`, `DOCTOR_LEAVE_CANCELLATION`, `POST_VISIT_SUMMARY`, `MEDICATION_REMINDER`
- **Working Hours Schema (JSON)**: `{ "start": "09:00", "end": "17:00" }`
- **Prescription Schema (JSON)**: `{ "diagnosis": "...", "medicines": [{ "name": "...", "dosage": "...", "frequency": "...", "duration": "..." }], "followUpInstructions": "..." }`
