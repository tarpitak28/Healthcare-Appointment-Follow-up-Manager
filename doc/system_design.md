# Healthcare Appointment & Follow-Up Manager — System Design Document

## 1. Architectural Overview & System Design Philosophy
The **Healthcare Appointment & Follow-Up Manager** is designed for high concurrency, zero-hallucination patient safety, and operational reliability. The core architecture uses a decoupled Node.js/Express backend, a PostgreSQL database managed via Prisma ORM, a React (Vite) single-page application frontend, and an asynchronous notification retry system.

---

## 2. Double-Booking Prevention Mechanism
To guarantee strict slot uniqueness under concurrent access (such as two patients attempting to book the exact same doctor and time slot simultaneously), the application enforces a multi-layered defense strategy:

1. **Database-Level Partial Unique Index**:
   A PostgreSQL partial unique index (`unique_active_doctor_slot`) is defined on the `Appointment` table:
   ```sql
   CREATE UNIQUE INDEX "unique_active_doctor_slot"
   ON "Appointment" ("doctorProfileId", "appointmentDate", "startTime")
   WHERE status IN ('BOOKED', 'COMPLETED');
   ```
   This index enforces strict uniqueness across active appointments while allowing `CANCELLED` appointments to free up slots for reuse.

2. **Lock-Free Concurrency Execution**:
   When two booking requests race, PostgreSQL serializes transaction commits. The first transaction succeeds with HTTP 201 Created. The second transaction immediately triggers a unique constraint violation (`P2002`), which the controller catches and converts into an immediate, clean `HTTP 409 Conflict` response (`"Selected time slot is no longer available"`).

---

## 3. Slot Hold Mechanism (Ephemeral Reservations)
To prevent race conditions while patients are filling out symptom descriptions, the system implements an ephemeral 5-minute slot reservation system:

1. **`SlotHold` Schema**:
   The `SlotHold` table tracks temporary holds indexed by `("doctorProfileId", "appointmentDate", "startTime")` with an `expiresAt` timestamp.

2. **Hold Acquisition**:
   When a patient selects an available slot, a `POST /api/patient/doctors/:id/hold-slot` request is issued. If no active hold or booked appointment exists, a 5-minute hold is registered.

3. **Automatic Expiry Cron Worker**:
   A background cron worker runs every minute to delete expired holds (`expiresAt < NOW()`), restoring slot availability to the pool automatically without requiring manual patient action.

---

## 4. Doctor Leave Conflict Handling
When a doctor submits single or multi-day leave via `POST /api/admin/doctors/:doctorProfileId/leave`, the system executes an automated conflict resolution pipeline:

1. **Date-Range Overlap Query**:
   The system queries all active `BOOKED` appointments for that doctor falling within `[startDate, endDate]`.

2. **Automatic Cancellation**:
   Affected appointments are transitioned to `status = 'CANCELLED'`.

3. **Patient Notification Dispatch**:
   For each cancelled appointment, the system enqueues a priority `DOCTOR_LEAVE_CANCELLATION` notification payload into the `NotificationLog` table. Affected patients receive an urgent email detailing the cancellation, reason, and instructions to reschedule.

---

## 5. Notification Failure & Reliability System
To ensure critical emails (booking confirmations, doctor leave alerts, medication reminders) are never silently lost due to temporary SMTP errors or network outages, the system replaces BullMQ/Redis with a lightweight, database-backed persistent queue:

1. **`NotificationLog` Idempotency**:
   Every notification attempt is tagged with a unique `eventKey` (`<entityId>:<type>`). Duplicate dispatch attempts hit a unique constraint and are safely ignored.

2. **Immediate Nodemailer Dispatch & Soft Error Handling**:
   The initial email dispatch attempt is wrapped in a soft try/catch block. If Nodemailer succeeds, status becomes `'SENT'`. If it fails (e.g., SMTP credentials or network timeout), the record remains `'FAILED'` or `'PENDING'` with `attempts = 1` and `lastError` captured.

3. **Bounded Exponential Backoff Retry Cron**:
   A background worker executes every minute (`processNotificationRetries`). It queries due notifications (`status IN ('PENDING', 'FAILED') AND nextAttemptAt <= NOW() AND attempts < 5`).
   
   Retry delays follow a bounded backoff schedule:
   - Attempt 1: +1 minute
   - Attempt 2: +5 minutes
   - Attempt 3: +15 minutes
   - Attempt 4: +60 minutes
   - Attempt 5: Final state set to `'FAILED'` (max attempts bounded).

---

## 6. LLM Zero-Hallucination & Fail-Safe Pipeline
Pre-visit and post-visit AI summaries utilize Gemini 2.0 Flash with low temperature (`0.2`) and Zod schema contracts (`PostVisitSummarySchema`). 

A custom anti-hallucination engine (`validateSourceGrounding`) validates that generated diagnoses and medications are explicitly grounded in clinical notes. Any unstated diagnosis or medication flags `needsHumanReview = true`, holding the summary until verified by the doctor on their dashboard.
