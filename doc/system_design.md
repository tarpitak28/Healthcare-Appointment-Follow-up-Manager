# HealthPulse — System Design & Architecture Specification

## Executive Summary
**HealthPulse** is an enterprise-grade healthcare appointment and follow-up management platform built on Node.js, Prisma ORM, PostgreSQL, and React. The architecture is engineered for database-level concurrency protection, fault-tolerant asynchronous notifications, and high-availability operations.

---

## 1. Double-Booking Prevention Mechanism
To guarantee strict slot uniqueness under concurrent access (e.g., simultaneous checkout requests for the exact same doctor and time slot), HealthPulse implements database-enforced concurrency protection rather than in-memory locks.

### Database Partial Unique Index
A PostgreSQL partial unique index (`unique_active_doctor_slot`) is applied to the `Appointment` table:
```sql
CREATE UNIQUE INDEX "unique_active_doctor_slot"
ON "Appointment" ("doctorProfileId", "appointmentDate", "startTime")
WHERE status IN ('BOOKED', 'COMPLETED');
```

### Execution Flow & Concurrency Defense
- **ACID Isolation**: PostgreSQL serializes transaction commits at the database engine level.
- **Lock-Free Resolution**: The winning request commits with `201 Created`. The racing request immediately violates the partial unique index, throwing a Prisma `P2002` error.
- **Controller Handling**: The API catches `P2002` and converts it into a structured `HTTP 409 Conflict` (`"Selected time slot is no longer available"`), eliminating race conditions without distributed lock overhead.

---

## 2. Ephemeral Slot Hold Mechanism
To prevent slot squatting and race conditions while patients complete pre-visit symptom questionnaires, HealthPulse provides an ephemeral reservation system.

### Ephemeral Table Schema (`SlotHold`)
When a slot is clicked, a 5-minute reservation record is inserted into the `SlotHold` table, indexed by `(doctorProfileId, appointmentDate, startTime)` with an explicit `expiresAt` timestamp set to `NOW() + 5 minutes`.

### Background TTL Cleanup Worker
A background cron worker executes every minute to release expired holds:
```javascript
await prisma.slotHold.deleteMany({
  where: { expiresAt: { lt: new Date() } }
});
```
This automated cleanup guarantees that abandoned checkout flows immediately return available slots to the booking pool.

---

## 3. Doctor Leave Conflict Handling & Administrative Cascade
When an Admin marks a doctor on leave via `POST /api/admin/doctors/:id/leave`, HealthPulse executes an atomic cascading cancellation flow across the specified `[startDate, endDate]` range.

### Cascading Cancellation Workflow
1. **Conflict Query**: Finds all active `BOOKED` appointments for the doctor within the leave date range.
2. **State Transition**: Transitions all matching records from `BOOKED` to `CANCELLED` in a single atomic database batch.
3. **Google Calendar Cleanup**: Hits the Google Calendar API (`events.delete`) using stored `calendarEventId` references to remove scheduled entries from both doctor and patient calendars (`sendUpdates: 'all'`).
4. **Priority Email Alerts**: Asynchronously enqueues high-priority `DOCTOR_LEAVE_CANCELLATION` email payloads to affected patients, detailing the cancellation and providing immediate rescheduling links.

---

## 4. Notification Failure & Reliability Architecture
To ensure critical emails (booking confirmations, doctor leave notices, medication reminders) are delivered reliably without Redis/BullMQ dependency, HealthPulse implements a database-backed Dead-Letter Queue (DLQ) with SMTP error classification.

### Idempotency & Log Tracking
Every outbound notification is logged in the `NotificationLog` table with a deterministic `eventKey` (`<appointmentId>:<type>:<recipient>`). Duplicate dispatch attempts violate the `eventKey` unique index and are safely ignored.

### SMTP Error Classification & Dead-Letter Queue (DLQ)
Nodemailer dispatches evaluate raw SMTP codes to determine retryability:
- **Permanent Failures (DLQ / `dead`)**: SMTP 5xx errors (`550 User Unknown`, `535 Auth Error`), syntax errors, or invalid addresses instantly transition status to `dead` with `nextRetryAt = null`.
- **Transient Failures (`failed`)**: SMTP 4xx errors (`421`, `450`, `451`) or network socket timeouts (`ETIMEDOUT`, `ECONNRESET`) transition status to `failed` and schedule exponential backoff retries.

### Bounded Exponential Backoff Worker
A background worker executes every minute (`processNotificationRetries`). It queries due transient failures (`status = 'failed' AND nextRetryAt <= NOW() AND attempts < 5`). Retry delays follow a bounded backoff formula:
$$\text{nextRetryAt} = \text{NOW}() + (2^{\text{attempts}} \times 60 \text{ seconds})$$
- Attempt 1: 2 minutes | Attempt 2: 4 minutes | Attempt 3: 8 minutes | Attempt 4: 16 minutes
- If `attempts >= 5`, the notification transitions permanently to `dead` (DLQ), preserving system stability.
