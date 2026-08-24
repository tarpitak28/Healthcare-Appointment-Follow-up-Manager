# System Design — Healthcare Appointment & Follow-up Manager

## 1. Double-Booking Prevention

CareConnect enforces strict concurrency protection to prevent double-booking identical doctor slots under high concurrent request volumes. The primary defense layer utilizes a PostgreSQL partial unique index on the `Appointment` table:

```sql
CREATE UNIQUE INDEX unique_active_doctor_slot
ON "Appointment" ("doctorProfileId", "appointmentDate", "startTime")
WHERE status IN ('BOOKED', 'COMPLETED');
```

When concurrent booking requests arrive at the exact same millisecond for an available doctor slot, PostgreSQL enforces row-level exclusivity at the storage engine layer. One transaction succeeds (`HTTP 201 Created`), while concurrent transactions trigger a database constraint violation. The backend catches Prisma error `P2002` and converts it into a structured `HTTP 409 Conflict` response with message `"This slot has already been booked by another patient"`.

The partial index filter `WHERE status IN ('BOOKED', 'COMPLETED')` ensures cancelled appointments (`status = 'CANCELLED'`) do not occupy unique index keys. This design permits patients to immediately re-book previously cancelled slots while retaining complete historical cancellation audit records in the database.

---

## 2. Doctor Leave Conflict Handling

Doctor leave management resolves schedule overlaps when an administrator marks a doctor as unavailable across a multi-day date range (`startDate` to `endDate`).

Upon receiving a leave submission, the backend validates that `endDate` is on or after `startDate`. Within an atomic database transaction, the system queries all active appointments (`status = 'BOOKED'`) for that doctor falling within `[startDate, endDate]`. For every matching appointment:

1. The status is updated to `CANCELLED`.
2. Associated Google Calendar events are deleted via Google API.
3. An idempotent `NotificationLog` entry (`type = DOCTOR_LEAVE_CANCELLATION`) is generated for each affected patient.
4. Transactional emails containing the leave reason and cancellation notice are dispatched via Nodemailer.

Subsequent slot queries for the leave period dynamically exclude all dates within the active leave range, blocking new booking attempts.

---

## 3. Slot Hold Mechanism

To protect patients from race conditions while completing pre-visit symptom questionnaires, CareConnect implements an ephemeral slot reservation system using the `SlotHold` model:

```prisma
model SlotHold {
  id              String        @id @default(uuid())
  doctorProfileId String
  patientId       String
  appointmentDate DateTime      @db.Date
  startTime       String
  expiresAt       DateTime
  @@unique([doctorProfileId, appointmentDate, startTime])
}
```

When a patient selects a 30-minute slot, the system creates a 5-minute hold with `expiresAt = NOW() + 5 minutes`. The `@@unique` constraint prevents concurrent users from holding the same slot simultaneously. Available slot calculations query active holds and filter out any slot where `expiresAt > NOW()`.

When the patient confirms the booking, the hold is deleted within the appointment creation transaction. Unconfirmed holds automatically expire after 300 seconds and are cleaned up by periodic background tasks.

---

## 4. Notification Failure Handling

Transactional email reliability is achieved through an asynchronous, idempotent notification engine using the `NotificationLog` table.

Every notification event generates a unique `eventKey` (e.g., `booking_confirm_<appointmentId>_<userId>`). The unique constraint on `eventKey` guarantees idempotency, preventing duplicate email dispatches during network retries or concurrent triggers.

When an email fails (e.g., SMTP timeout or rate limit), the service catches the error, increments `attempts`, sets `status = PENDING`, and calculates the next retry timestamp using bounded exponential backoff:

$$\text{Delay} = \min(60, 2^{\text{attempts}}) \text{ minutes}$$

A background cron task (`node-cron`) polls for due notifications (`status = PENDING` AND `nextAttemptAt <= NOW()`) every 60 seconds. Notifications encountering 5 consecutive failures transition to `status = FAILED` to avoid infinite retry loops.
