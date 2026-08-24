# HealthPulse: System Architecture & Design Document

## 1. Concurrency Control: Double-Booking Prevention
In healthcare scheduling, race conditions occur when two patients attempt to book the same doctor for the exact same time slot concurrently. To prevent double-booking at the lowest possible level, HealthPulse employs **Database-Level Constraints** rather than relying solely on application-layer validation.

We implemented a **PostgreSQL Partial Unique Index** via Prisma:
```sql
CREATE UNIQUE INDEX "unique_active_doctor_slot"
ON "Appointment" ("doctorProfileId", "appointmentDate", "startTime")
WHERE status IN ('BOOKED', 'COMPLETED');
```
This index is conditionally applied only to appointments where the status is `BOOKED` or `COMPLETED`. If two concurrent requests bypass the application-layer checks, the PostgreSQL engine serializes the transactions and throws an immediate constraint violation error (HTTP 409 Conflict) on the second insertion. This guarantees absolute data integrity without locking the entire table.

---

## 2. Distributed Locking: Slot Hold Mechanism
While the database constraint prevents the final double-booking, the user experience suffers if a patient spends time filling out the symptom form only to find the slot was taken milliseconds before submission.

To solve this, we implemented an **Ephemeral Slot Hold Mechanism**. When a patient clicks a time slot, the frontend instantly dispatches a request to create a `SlotHold` record. 
- This record acts as a distributed lock, reserving the `(doctorProfileId, date, time)` tuple exclusively for that patient's session.
- The lock has a strict **5-minute Time-To-Live (TTL)**. 
- A background cron worker (`cronService.js`) sweeps the database every 60 seconds, purging expired holds. If the patient does not complete the booking within 5 minutes, the slot is automatically released back to the public pool, preventing malicious slot hoarding.

---

## 3. Administrative Override: Doctor Leave Conflict Handling
Hospital administration requires the ability to mandate doctor leaves dynamically, which cascades into existing scheduled appointments.

When an admin enforces a leave interval, the system executes an **Atomic Database Transaction**. 
1. The system identifies all `BOOKED` appointments overlapping with the target date range.
2. It transitions their status to `CANCELLED` with a specific reason code (`DOCTOR_LEAVE`).
3. To ensure both parties are immediately aware, the transaction hooks into the `calendarService` to issue Google Calendar API `DELETE` requests, stripping the events from the doctor and patients' calendars.
4. It enqueues high-priority cancellation emails into the `NotificationLog` with a unique `eventKey` to ensure affected patients receive direct rescheduling links.

---

## 4. Fault Tolerance: Notification Failure Handling
Relying on external APIs (Google Calendar, SMTP servers) introduces network volatility. To ensure the system never breaks during an API outage, we designed an **Idempotent Dead-Letter Queue (DLQ) Notification Engine**.

Instead of blocking the HTTP response to send an email, the booking controller writes the email payload to a `NotificationLog` table with a deterministic `eventKey` and returns a `201 Created` instantly. 
A background Node.js cron worker polls this table:
- **Transient Errors (SMTP 4xx, Network Timeouts):** The worker catches the error, marks the status as `failed`, and calculates an **Exponential Backoff** for the next retry (`NOW() + 2^attempts minutes`). 
- **Permanent Errors (SMTP 5xx, Invalid Address):** The error is classified as unrecoverable. The record is moved to the Dead-Letter Queue (`status: 'dead'`), halting retries to preserve server resources and prevent domain blacklisting. 
- **Connection Pooling:** The Nodemailer transport uses TCP socket pooling (`maxConnections: 5`) to prevent socket exhaustion during high-volume operations like daily medication reminders.
