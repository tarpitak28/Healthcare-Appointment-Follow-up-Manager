# CareConnect — Healthcare System Architecture & Design

## 1. System Overview & Architecture

CareConnect is a healthcare appointment and patient management SaaS platform engineered with a decoupled React SPA frontend and a Node.js/Express REST backend backed by a PostgreSQL database managed via Prisma ORM.

```text
React 18 SPA (Teal #3FA3C3 UI) ──► Express REST API ──► PostgreSQL (Prisma ORM)
                                           │
                        ┌──────────────────┼──────────────────┐
                        ▼                  ▼                  ▼
               Notification Service  Gemini AI API    Google Calendar API
```

---

## 2. Double-Booking Prevention & Concurrency Protection

CareConnect defends against simultaneous booking race conditions (`Patient A` and `Patient B` requesting the exact same slot at `10:00 AM`) through a multi-layered concurrency defense:

1. **Database-Level Partial Unique Index**:
   A PostgreSQL partial unique index (`unique_active_doctor_slot`) is defined on `(doctorProfileId, appointmentDate, startTime)` where `status != 'CANCELLED'`.
2. **Atomic Transaction Isolation**:
   Booking creation requests run inside `prisma.$transaction`. If two concurrent requests arrive simultaneously, PostgreSQL enforces row serialization; exactly one transaction succeeds (`HTTP 201 Created`), while the second encounters a unique key collision (`P2002`) and returns `HTTP 409 Conflict`.

---

## 3. Short-Lived Slot Hold Mechanism

CareConnect implements an ephemeral 5-minute slot hold reservation system during patient slot selection:

- **State Management**: When a patient clicks a slot, a 300-second timer (`isHoldActive`) initializes in component state while registering a hold in the backend (`SlotHold` memory map).
- **Expiration & Abandonment**: Held slots display an active timer (`✓ Slot reserved for you — 04:37`). If unconfirmed after 300 seconds or abandoned, the hold automatically expires, reverting the slot to available status.

---

## 4. Doctor Leave Conflict Handling

When an Admin enforces doctor leave across a date range (`startDate` to `endDate`):

1. **Conflict Discovery**: The system queries all active bookings for that doctor profile overlapping the leave interval.
2. **Automated Cancellation**: Affected appointments are transitioned to `CANCELLED` status with the reason `Doctor On Leave`.
3. **Patient Notifications**: `NotificationService` dispatches individual `DOCTOR_LEAVE_CANCELLATION` email alerts to affected patients.
4. **Availability Restriction**: Slot queries for dates within the leave interval return `isOnLeave: true`, disabling new booking attempts.

---

## 5. Notification Service & Asynchronous Reliability

CareConnect handles email delivery failures gracefully without failing critical booking transactions:

- **Decoupled Outbox Design**: Booking creation commits the appointment to PostgreSQL regardless of SMTP status.
- **Idempotent Audit Log**: Every notification records a unique `eventKey` (`appointmentId:EVENT_TYPE`) in `NotificationLog`.
- **Bounded Exponential Backoff**: Email delivery retries follow a schedule (1m → 5m → 15m → 60m, capped at 5 attempts). If SMTP is down, the booking remains valid while the cron worker retries notification dispatches asynchronously.
- **Recipient Isolation**: Notifications send individual emails (`to: user.email`) without shared `CC`/`BCC` fields.

---

## 6. AI Grounding & Google Calendar Resilience

- **AI Zero-Hallucination Guardrails**: Clinical summaries generated via Gemini AI are validated against raw symptoms. Discovered unstated medications or prompt injection attempts flag `needsHumanReview = true` for doctor inspection without breaking consultation submission.
- **Google Calendar Isolation**: Calendar API sync errors are logged without rolling back appointment records in PostgreSQL.
